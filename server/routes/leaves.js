const express = require('express');
const db = require('../db');
const { authMiddleware, managerOrAdmin } = require('../middleware/auth');

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
router.get('/balance/:employeeId', (req, res) => {
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
    SELECT la.*, lt.name as leaveType, e.name as approvedByName
    FROM leave_applications la
    JOIN leave_types lt ON la.leaveTypeId = lt.id
    LEFT JOIN employees e ON la.approvedBy = e.id
    WHERE la.employeeId = ?
    ORDER BY la.appliedOn DESC
  `).all(req.user.id);
  res.json(apps);
});

// Get all leave applications (admin/manager view)
router.get('/all-applications', (req, res) => {
  let query = `
    SELECT la.*, lt.name as leaveType, e.name as employeeName, e.employeeId as empCode,
           e.department, a.name as approvedByName
    FROM leave_applications la
    JOIN leave_types lt ON la.leaveTypeId = lt.id
    JOIN employees e ON la.employeeId = e.id
    LEFT JOIN employees a ON la.approvedBy = a.id
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

  const result = db.prepare(`
    INSERT INTO leave_applications (employeeId, leaveTypeId, fromDate, toDate, days, reason)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, leaveTypeId, fromDate, toDate, days, reason);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Leave applied successfully' });
});

// Approve/reject leave (admin/manager)
router.put('/action/:id', managerOrAdmin, (req, res) => {
  const { status, remarks } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  const app = db.prepare('SELECT * FROM leave_applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

  db.prepare('UPDATE leave_applications SET status = ?, approvedBy = ?, remarks = ? WHERE id = ?')
    .run(status, req.user.id, remarks || null, req.params.id);

  if (status === 'approved') {
    db.prepare('UPDATE leave_balances SET used = used + ? WHERE employeeId = ? AND leaveTypeId = ?')
      .run(app.days, app.employeeId, app.leaveTypeId);
  }

  res.json({ message: `Leave ${status}` });
});

module.exports = router;
