const express = require('express');
const db = require('../db');
const { authMiddleware, managerOrAdmin, adminOnly } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();
router.use(authMiddleware);

// Get leave types
router.get('/types', (req, res) => {
  const types = db.prepare('SELECT * FROM leave_types').all();
  res.json(types);
});

// Get my leave balance
router.get('/balance', (req, res) => {
  const balances = db.prepare(`
    SELECT lb.*, lt.name as leaveType, lt.description
    FROM leave_balances lb JOIN leave_types lt ON lb.leaveTypeId = lt.id
    WHERE lb.employeeId = ?
  `).all(req.user.id);
  res.json(balances);
});

// Get leave balance for any employee (admin/manager)
router.get('/balance/:employeeId', managerOrAdmin, (req, res) => {
  const balances = db.prepare(`
    SELECT lb.*, lt.name as leaveType, lt.description
    FROM leave_balances lb JOIN leave_types lt ON lb.leaveTypeId = lt.id
    WHERE lb.employeeId = ?
  `).all(req.params.employeeId);
  res.json(balances);
});

// Get my leave applications
router.get('/my-applications', (req, res) => {
  const apps = db.prepare(`
    SELECT la.*, lt.name as leaveType,
           m.name as managerApprovedByName, h.name as hrApprovedByName
    FROM leave_applications la
    JOIN leave_types lt ON la.leaveTypeId = lt.id
    LEFT JOIN employees m ON la.managerApprovedBy = m.id
    LEFT JOIN employees h ON la.hrApprovedBy = h.id
    WHERE la.employeeId = ?
    ORDER BY la.appliedOn DESC
  `).all(req.user.id);
  res.json(apps);
});

// Get all leave applications (admin/manager view)
router.get('/all-applications', managerOrAdmin, (req, res) => {
  let query = `
    SELECT la.*, lt.name as leaveType, e.name as employeeName, e.employeeId as empCode,
           e.department, m.name as managerApprovedByName, h.name as hrApprovedByName
    FROM leave_applications la
    JOIN leave_types lt ON la.leaveTypeId = lt.id
    JOIN employees e ON la.employeeId = e.id
    LEFT JOIN employees m ON la.managerApprovedBy = m.id
    LEFT JOIN employees h ON la.hrApprovedBy = h.id
  `;

  if (req.user.role === 'manager') {
    query += ` WHERE la.employeeId IN (SELECT id FROM employees WHERE managerId = ${req.user.id})`;
  }

  query += ' ORDER BY la.appliedOn DESC';
  const apps = db.prepare(query).all();
  res.json(apps);
});

// Apply for leave
router.post('/apply', (req, res) => {
  const { leaveTypeId, fromDate, toDate, days, reason } = req.body;
  if (!leaveTypeId || !fromDate || !toDate || !days) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check balance
  const balance = db.prepare('SELECT * FROM leave_balances WHERE employeeId = ? AND leaveTypeId = ?').get(req.user.id, leaveTypeId);
  if (!balance || (balance.total - balance.used) < days) {
    return res.status(400).json({ error: 'Insufficient leave balance' });
  }

  const leaveType = db.prepare('SELECT name FROM leave_types WHERE id = ?').get(leaveTypeId);
  const result = db.prepare(`
    INSERT INTO leave_applications (employeeId, leaveTypeId, fromDate, toDate, days, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending_manager')
  `).run(req.user.id, leaveTypeId, fromDate, toDate, days, reason);

  // Notify manager
  const emp = db.prepare('SELECT managerId FROM employees WHERE id = ?').get(req.user.id);
  if (emp?.managerId) {
    createNotification(emp.managerId, 'New Leave Request', `${req.user.name} applied for ${days} day(s) ${leaveType?.name || 'leave'} (${fromDate} to ${toDate})`, 'leave', '/leaves');
  }

  // Log activity
  db.prepare('INSERT INTO activity_log (userId, action, target, details) VALUES (?,?,?,?)').run(req.user.id, 'Applied leave', `Leave #${result.lastInsertRowid}`, `${leaveType?.name} - ${days} days`);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Leave applied successfully. Sent to manager for approval.' });
});

// Manager approves/rejects leave (first level)
router.put('/manager-action/:id', managerOrAdmin, (req, res) => {
  const { status, remarks } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  const app = db.prepare('SELECT la.*, e.name as employeeName FROM leave_applications la JOIN employees e ON la.employeeId = e.id WHERE la.id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending_manager') return res.status(400).json({ error: 'This leave is not pending manager approval' });

  // Verify this manager is the employee's manager (unless admin)
  if (req.user.role === 'manager') {
    const employee = db.prepare('SELECT managerId FROM employees WHERE id = ?').get(app.employeeId);
    if (!employee || employee.managerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only approve leaves for your team members' });
    }
  }

  if (status === 'rejected') {
    db.prepare(`UPDATE leave_applications SET status = 'rejected', managerApprovedBy = ?, managerRemarks = ?, managerActionDate = datetime('now') WHERE id = ?`)
      .run(req.user.id, remarks || null, req.params.id);

    // Notify employee
    createNotification(app.employeeId, 'Leave Rejected', `Your leave request (${app.days} days) was rejected by manager`, 'leave', '/leaves');

    res.json({ message: 'Leave rejected by manager' });
  } else {
    db.prepare(`UPDATE leave_applications SET status = 'pending_hr', managerApprovedBy = ?, managerRemarks = ?, managerActionDate = datetime('now') WHERE id = ?`)
      .run(req.user.id, remarks || null, req.params.id);

    // Notify employee
    createNotification(app.employeeId, 'Leave Approved by Manager', `Your leave request is now pending HR approval`, 'leave', '/leaves');

    // Notify all admins (HR)
    const admins = db.prepare("SELECT id FROM employees WHERE role = 'admin'").all();
    admins.forEach(a => {
      createNotification(a.id, 'Leave Pending HR Approval', `${app.employeeName}'s leave (${app.days} days) approved by manager, needs HR approval`, 'leave', '/leaves');
    });

    res.json({ message: 'Leave approved by manager. Sent to HR for final approval.' });
  }
});

// HR (admin) approves/rejects leave (second level)
router.put('/hr-action/:id', adminOnly, (req, res) => {
  const { status, remarks } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  const app = db.prepare('SELECT la.*, e.name as employeeName, e.managerId FROM leave_applications la JOIN employees e ON la.employeeId = e.id WHERE la.id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending_hr') return res.status(400).json({ error: 'This leave is not pending HR approval' });

  if (status === 'rejected') {
    db.prepare(`UPDATE leave_applications SET status = 'rejected', hrApprovedBy = ?, hrRemarks = ?, hrActionDate = datetime('now') WHERE id = ?`)
      .run(req.user.id, remarks || null, req.params.id);

    // Notify employee and manager
    createNotification(app.employeeId, 'Leave Rejected by HR', `Your leave request (${app.days} days) was rejected by HR`, 'leave', '/leaves');
    if (app.managerId) createNotification(app.managerId, 'Leave Rejected by HR', `${app.employeeName}'s leave was rejected by HR`, 'leave', '/leaves');

    res.json({ message: 'Leave rejected by HR' });
  } else {
    db.prepare(`UPDATE leave_applications SET status = 'approved', hrApprovedBy = ?, hrRemarks = ?, hrActionDate = datetime('now') WHERE id = ?`)
      .run(req.user.id, remarks || null, req.params.id);

    db.prepare('UPDATE leave_balances SET used = used + ? WHERE employeeId = ? AND leaveTypeId = ?')
      .run(app.days, app.employeeId, app.leaveTypeId);

    // Notify employee and manager
    createNotification(app.employeeId, 'Leave Approved', `Your leave request (${app.days} days) has been approved`, 'success', '/leaves');
    if (app.managerId) createNotification(app.managerId, 'Leave Approved by HR', `${app.employeeName}'s leave has been approved by HR`, 'success', '/leaves');

    res.json({ message: 'Leave approved by HR' });
  }
});

module.exports = router;
