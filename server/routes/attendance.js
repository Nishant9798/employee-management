const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get my attendance for a month
router.get('/my', (req, res) => {
  const { month, year } = req.query;
  const m = month || (new Date().getMonth() + 1);
  const y = year || new Date().getFullYear();
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-31`;

  const records = db.prepare(`
    SELECT * FROM attendance WHERE employeeId = ? AND date BETWEEN ? AND ? ORDER BY date
  `).all(req.user.id, startDate, endDate);

  res.json(records);
});

// Get attendance for an employee (admin/manager)
router.get('/employee/:id', (req, res) => {
  const { month, year } = req.query;
  const m = month || (new Date().getMonth() + 1);
  const y = year || new Date().getFullYear();
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-31`;

  const records = db.prepare(`
    SELECT * FROM attendance WHERE employeeId = ? AND date BETWEEN ? AND ? ORDER BY date
  `).all(req.params.id, startDate, endDate);

  res.json(records);
});

// Get today's attendance for all employees (admin)
router.get('/today', (req, res) => {
  const today = req.query.date || new Date().toISOString().split('T')[0];
  const records = db.prepare(`
    SELECT a.*, e.name, e.employeeId as empCode, e.department, e.designation
    FROM attendance a JOIN employees e ON a.employeeId = e.id
    WHERE a.date = ? AND e.status = 'active'
    ORDER BY e.name
  `).all(today);

  // Also get employees with no record (absent)
  const allActive = db.prepare("SELECT id, employeeId as empCode, name, department, designation FROM employees WHERE status='active'").all();
  const markedIds = new Set(records.map(r => r.employeeId));
  const absent = allActive.filter(e => !markedIds.has(e.id)).map(e => ({
    ...e, employeeId: e.id, date: today, status: 'absent', checkIn: null, checkOut: null, workHours: 0
  }));

  res.json([...records, ...absent]);
});

// Check in
router.post('/checkin', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  const existing = db.prepare('SELECT * FROM attendance WHERE employeeId = ? AND date = ?').get(req.user.id, today);
  if (existing?.checkIn) return res.status(400).json({ error: 'Already checked in today' });

  const status = parseInt(now.split(':')[0]) >= 10 ? 'late' : 'present';

  if (existing) {
    db.prepare('UPDATE attendance SET checkIn = ?, status = ? WHERE id = ?').run(now, status, existing.id);
  } else {
    db.prepare('INSERT INTO attendance (employeeId, date, checkIn, status) VALUES (?, ?, ?, ?)').run(req.user.id, today, now, status);
  }

  res.json({ message: 'Checked in at ' + now, status });
});

// Check out
router.post('/checkout', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  const existing = db.prepare('SELECT * FROM attendance WHERE employeeId = ? AND date = ?').get(req.user.id, today);
  if (!existing?.checkIn) return res.status(400).json({ error: 'You need to check in first' });
  if (existing.checkOut) return res.status(400).json({ error: 'Already checked out' });

  const checkInParts = existing.checkIn.split(':');
  const checkOutParts = now.split(':');
  const workHours = (parseInt(checkOutParts[0]) - parseInt(checkInParts[0])) + (parseInt(checkOutParts[1]) - parseInt(checkInParts[1])) / 60;
  const status = workHours < 5 ? 'halfday' : existing.status;

  db.prepare('UPDATE attendance SET checkOut = ?, workHours = ?, status = ? WHERE id = ?').run(now, Math.round(workHours * 10) / 10, status, existing.id);
  res.json({ message: 'Checked out at ' + now, workHours: Math.round(workHours * 10) / 10 });
});

// Mark attendance (admin)
router.post('/mark', adminOnly, (req, res) => {
  const { employeeId, date, checkIn, checkOut, status } = req.body;
  try {
    db.prepare(`
      INSERT INTO attendance (employeeId, date, checkIn, checkOut, status)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(employeeId, date) DO UPDATE SET checkIn=?, checkOut=?, status=?
    `).run(employeeId, date, checkIn, checkOut, status, checkIn, checkOut, status);
    res.json({ message: 'Attendance marked' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Attendance summary for a month
router.get('/summary', (req, res) => {
  const { month, year } = req.query;
  const m = month || (new Date().getMonth() + 1);
  const y = year || new Date().getFullYear();
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-31`;

  const summary = db.prepare(`
    SELECT e.id, e.employeeId as empCode, e.name, e.department,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
      SUM(CASE WHEN a.status = 'halfday' THEN 1 ELSE 0 END) as halfday,
      ROUND(AVG(CASE WHEN a.workHours > 0 THEN a.workHours END), 1) as avgHours
    FROM employees e
    LEFT JOIN attendance a ON e.id = a.employeeId AND a.date BETWEEN ? AND ?
    WHERE e.status = 'active'
    GROUP BY e.id
    ORDER BY e.name
  `).all(startDate, endDate);

  res.json(summary);
});


// Bulk mark attendance (admin)
router.post('/bulk-mark', adminOnly, (req, res) => {
  const { date, records } = req.body;
  if (!date || !records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Date and records array required' });
  }

  const stmt = db.prepare(`
    INSERT INTO attendance (employeeId, date, checkIn, checkOut, status)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(employeeId, date) DO UPDATE SET checkIn=?, checkOut=?, status=?
  `);

  const transaction = db.transaction((recs) => {
    for (const rec of recs) {
      stmt.run(rec.employeeId, date, rec.checkIn || null, rec.checkOut || null, rec.status,
               rec.checkIn || null, rec.checkOut || null, rec.status);
    }
  });

  try {
    transaction(records);
    res.json({ message: `Attendance marked for ${records.length} employees` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Export attendance CSV
router.get('/export/csv', adminOnly, (req, res) => {
  const { month, year } = req.query;
  const m = month || (new Date().getMonth() + 1);
  const y = year || new Date().getFullYear();
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = `${y}-${String(m).padStart(2, '0')}-31`;

  const records = db.prepare(`
    SELECT e.employeeId, e.name, e.department, a.date, a.checkIn, a.checkOut, a.status, a.workHours
    FROM attendance a JOIN employees e ON a.employeeId = e.id
    WHERE a.date BETWEEN ? AND ? AND e.status = 'active'
    ORDER BY e.name, a.date
  `).all(startDate, endDate);

  const headers = 'Employee ID,Name,Department,Date,Check In,Check Out,Status,Work Hours\n';
  const csv = headers + records.map(r =>
    `${r.employeeId},${r.name},${r.department || ''},${r.date},${r.checkIn || ''},${r.checkOut || ''},${r.status},${r.workHours || ''}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=attendance-${y}-${m}.csv`);
  res.send(csv);
});

module.exports = router;
