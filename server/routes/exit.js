const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly, managerOrAdmin } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();
router.use(authMiddleware);

// Submit resignation
router.post('/resign', (req, res) => {
  const { resignationDate, lastWorkingDate, reason } = req.body;
  if (!resignationDate || !lastWorkingDate) return res.status(400).json({ error: 'Dates required' });

  const existing = db.prepare("SELECT id FROM exit_requests WHERE employeeId = ? AND status NOT IN ('rejected','completed')").get(req.user.id);
  if (existing) return res.status(400).json({ error: 'You already have an active resignation request' });

  const result = db.prepare('INSERT INTO exit_requests (employeeId, resignationDate, lastWorkingDate, reason) VALUES (?,?,?,?)')
    .run(req.user.id, resignationDate, lastWorkingDate, reason);

  // Notify manager and HR
  const emp = db.prepare('SELECT managerId FROM employees WHERE id = ?').get(req.user.id);
  if (emp?.managerId) createNotification(emp.managerId, 'Resignation Submitted', `${req.user.name} has submitted their resignation`, 'warning', '/exit');
  const admins = db.prepare("SELECT id FROM employees WHERE role = 'admin'").all();
  admins.forEach(a => createNotification(a.id, 'Resignation Submitted', `${req.user.name} has submitted their resignation`, 'warning', '/exit'));

  res.status(201).json({ id: result.lastInsertRowid, message: 'Resignation submitted' });
});

// Get my exit request
router.get('/my', (req, res) => {
  const request = db.prepare(`
    SELECT er.*, a.name as approvedByName FROM exit_requests er
    LEFT JOIN employees a ON er.approvedBy = a.id WHERE er.employeeId = ? ORDER BY er.createdAt DESC LIMIT 1
  `).get(req.user.id);
  res.json(request || null);
});

// Get all exit requests (admin)
router.get('/all', adminOnly, (req, res) => {
  const requests = db.prepare(`
    SELECT er.*, e.name as employeeName, e.department, e.designation, e.employeeId as empCode,
           a.name as approvedByName
    FROM exit_requests er
    JOIN employees e ON er.employeeId = e.id
    LEFT JOIN employees a ON er.approvedBy = a.id
    ORDER BY er.createdAt DESC
  `).all();
  res.json(requests);
});

// Approve/reject resignation (admin)
router.put('/action/:id', adminOnly, (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const request = db.prepare('SELECT * FROM exit_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });

  db.prepare('UPDATE exit_requests SET status = ?, approvedBy = ? WHERE id = ?').run(status, req.user.id, req.params.id);
  createNotification(request.employeeId, `Resignation ${status}`, `Your resignation has been ${status}`, status === 'approved' ? 'warning' : 'info', '/exit');
  res.json({ message: `Resignation ${status}` });
});

// Update exit checklist (admin)
router.put('/checklist/:id', adminOnly, (req, res) => {
  const { exitInterviewDone, exitInterviewNotes, assetsReturned, assetsNotes } = req.body;
  db.prepare('UPDATE exit_requests SET exitInterviewDone=?, exitInterviewNotes=?, assetsReturned=?, assetsNotes=? WHERE id=?')
    .run(exitInterviewDone ? 1 : 0, exitInterviewNotes, assetsReturned ? 1 : 0, assetsNotes, req.params.id);
  res.json({ message: 'Checklist updated' });
});

// Complete exit (admin)
router.put('/complete/:id', adminOnly, (req, res) => {
  const request = db.prepare('SELECT * FROM exit_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE exit_requests SET status = ? WHERE id = ?').run('completed', req.params.id);
  db.prepare("UPDATE employees SET status = 'inactive' WHERE id = ?").run(request.employeeId);
  res.json({ message: 'Exit completed, employee deactivated' });
});

module.exports = router;
