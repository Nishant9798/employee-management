const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly, managerOrAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all shifts
router.get('/', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM shifts ORDER BY startTime').all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my shift
router.get('/my', (req, res) => {
  try {
    const shift = db.prepare(`
      SELECT es.*, s.name as shiftName, s.startTime, s.endTime, s.graceMinutes, s.description
      FROM employee_shifts es JOIN shifts s ON es.shiftId = s.id
      WHERE es.employeeId = ? ORDER BY es.fromDate DESC LIMIT 1
    `).get(req.user.id);
    res.json(shift || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all employee shifts (admin)
router.get('/all-assignments', adminOnly, (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Overtime routes - MUST be before /:id
router.get('/overtime/my', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM overtime_requests WHERE employeeId = ? ORDER BY date DESC').all(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/overtime/all', managerOrAdmin, (req, res) => {
  try {
    let query = `SELECT o.*, e.name, e.department FROM overtime_requests o JOIN employees e ON o.employeeId = e.id`;
    const params = [];
    if (req.user.role === 'manager') {
      query += ` WHERE o.employeeId IN (SELECT id FROM employees WHERE managerId = ?)`;
      params.push(req.user.id);
    }
    query += ' ORDER BY o.date DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create shift (admin)
router.post('/', adminOnly, (req, res) => {
  try {
    const { name, startTime, endTime, graceMinutes, description } = req.body;
    if (!name || !startTime || !endTime) return res.status(400).json({ error: 'Name, start time, and end time required' });
    const result = db.prepare('INSERT INTO shifts (name, startTime, endTime, graceMinutes, description) VALUES (?,?,?,?,?)')
      .run(name, startTime, endTime, graceMinutes || 15, description);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/overtime', (req, res) => {
  try {
    const { date, hours, reason } = req.body;
    if (!date || !hours || isNaN(hours) || hours <= 0) return res.status(400).json({ error: 'Valid date and hours required' });
    if (hours > 24) return res.status(400).json({ error: 'Overtime hours cannot exceed 24' });
    const result = db.prepare('INSERT INTO overtime_requests (employeeId, date, hours, reason) VALUES (?,?,?,?)')
      .run(req.user.id, date, hours, reason);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign shift (admin)
router.post('/assign', adminOnly, (req, res) => {
  try {
    const { employeeId, shiftId, fromDate, toDate } = req.body;
    if (!employeeId || !shiftId || !fromDate) return res.status(400).json({ error: 'Employee, shift, and start date required' });
    db.prepare('INSERT INTO employee_shifts (employeeId, shiftId, fromDate, toDate) VALUES (?,?,?,?) ON CONFLICT(employeeId, fromDate) DO UPDATE SET shiftId=?, toDate=?')
      .run(employeeId, shiftId, fromDate, toDate || null, shiftId, toDate || null);
    res.json({ message: 'Shift assigned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update shift (admin)
router.put('/:id', adminOnly, (req, res) => {
  try {
    const { name, startTime, endTime, graceMinutes, description } = req.body;
    db.prepare('UPDATE shifts SET name=?, startTime=?, endTime=?, graceMinutes=?, description=? WHERE id=?')
      .run(name, startTime, endTime, graceMinutes || 15, description, req.params.id);
    res.json({ message: 'Shift updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete shift (admin)
router.delete('/:id', adminOnly, (req, res) => {
  try {
    db.prepare('DELETE FROM employee_shifts WHERE shiftId = ?').run(req.params.id);
    db.prepare('DELETE FROM shifts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Shift deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/overtime/:id', managerOrAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const overtime = db.prepare('SELECT * FROM overtime_requests WHERE id = ?').get(req.params.id);
    if (!overtime) return res.status(404).json({ error: 'Overtime request not found' });
    if (overtime.status !== 'pending') return res.status(400).json({ error: 'This request has already been processed' });

    // Managers can only approve overtime for their team members
    if (req.user.role === 'manager') {
      const emp = db.prepare('SELECT managerId FROM employees WHERE id = ?').get(overtime.employeeId);
      if (!emp || emp.managerId !== req.user.id) {
        return res.status(403).json({ error: 'You can only approve overtime for your own team members' });
      }
    }

    db.prepare('UPDATE overtime_requests SET status = ?, approvedBy = ? WHERE id = ?').run(status, req.user.id, req.params.id);
    res.json({ message: `Overtime ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
