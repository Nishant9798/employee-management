const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly, managerOrAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all shifts
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM shifts ORDER BY startTime').all());
});

// Get my shift
router.get('/my', (req, res) => {
  const shift = db.prepare(`
    SELECT es.*, s.name as shiftName, s.startTime, s.endTime, s.graceMinutes, s.description
    FROM employee_shifts es JOIN shifts s ON es.shiftId = s.id
    WHERE es.employeeId = ? ORDER BY es.fromDate DESC LIMIT 1
  `).get(req.user.id);
  res.json(shift || {});
});

// Get all employee shifts (admin)
router.get('/all-assignments', adminOnly, (req, res) => {
  const assignments = db.prepare(`
    SELECT es.*, s.name as shiftName, s.startTime, s.endTime,
           e.name as employeeName, e.department, e.employeeId as empCode
    FROM employee_shifts es
    JOIN shifts s ON es.shiftId = s.id
    JOIN employees e ON es.employeeId = e.id
    WHERE e.status = 'active'
    ORDER BY e.name
  `).all();
  res.json(assignments);
});

// Create shift (admin)
router.post('/', adminOnly, (req, res) => {
  const { name, startTime, endTime, graceMinutes, description } = req.body;
  const result = db.prepare('INSERT INTO shifts (name, startTime, endTime, graceMinutes, description) VALUES (?,?,?,?,?)')
    .run(name, startTime, endTime, graceMinutes || 15, description);
  res.status(201).json({ id: result.lastInsertRowid });
});

// Update shift (admin)
router.put('/:id', adminOnly, (req, res) => {
  const { name, startTime, endTime, graceMinutes, description } = req.body;
  try {
    db.prepare('UPDATE shifts SET name=?, startTime=?, endTime=?, graceMinutes=?, description=? WHERE id=?')
      .run(name, startTime, endTime, graceMinutes || 15, description, req.params.id);
    res.json({ message: 'Shift updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete shift (admin)
router.delete('/:id', adminOnly, (req, res) => {
  try {
    // Remove employee assignments for this shift first
    db.prepare('DELETE FROM employee_shifts WHERE shiftId = ?').run(req.params.id);
    db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Shift deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Assign shift (admin)
router.post('/assign', adminOnly, (req, res) => {
  const { employeeId, shiftId, fromDate, toDate } = req.body;
  try {
    db.prepare('INSERT INTO employee_shifts (employeeId, shiftId, fromDate, toDate) VALUES (?,?,?,?) ON CONFLICT(employeeId, fromDate) DO UPDATE SET shiftId=?, toDate=?')
      .run(employeeId, shiftId, fromDate, toDate || null, shiftId, toDate || null);
    res.json({ message: 'Shift assigned' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Overtime requests
router.get('/overtime/my', (req, res) => {
  res.json(db.prepare('SELECT * FROM overtime_requests WHERE employeeId = ? ORDER BY date DESC').all(req.user.id));
});

router.post('/overtime', (req, res) => {
  const { date, hours, reason } = req.body;
  const result = db.prepare('INSERT INTO overtime_requests (employeeId, date, hours, reason) VALUES (?,?,?,?)')
    .run(req.user.id, date, hours, reason);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/overtime/all', managerOrAdmin, (req, res) => {
  let query = `SELECT o.*, e.name, e.department FROM overtime_requests o JOIN employees e ON o.employeeId = e.id`;
  if (req.user.role === 'manager') query += ` WHERE o.employeeId IN (SELECT id FROM employees WHERE managerId = ${req.user.id})`;
  query += ' ORDER BY o.date DESC';
  res.json(db.prepare(query).all());
});

router.put('/overtime/:id', managerOrAdmin, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE overtime_requests SET status = ?, approvedBy = ? WHERE id = ?').run(status, req.user.id, req.params.id);
  res.json({ message: `Overtime ${status}` });
});

module.exports = router;
