const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all employees
router.get('/', (req, res) => {
  const employees = db.prepare(`
    SELECT e.id, e.employeeId, e.name, e.email, e.phone, e.department, e.designation,
           e.joiningDate, e.managerId, e.role, e.avatar, e.status,
           m.name as managerName
    FROM employees e LEFT JOIN employees m ON e.managerId = m.id
    ORDER BY e.id
  `).all();
  res.json(employees);
});

// Get single employee
router.get('/:id', (req, res) => {
  const emp = db.prepare(`
    SELECT e.id, e.employeeId, e.name, e.email, e.phone, e.department, e.designation,
           e.joiningDate, e.managerId, e.role, e.avatar, e.status,
           m.name as managerName
    FROM employees e LEFT JOIN employees m ON e.managerId = m.id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  res.json(emp);
});

// Get hierarchy tree
router.get('/org/hierarchy', (req, res) => {
  const employees = db.prepare(`
    SELECT id, employeeId, name, department, designation, managerId, role, avatar
    FROM employees WHERE status = 'active' ORDER BY id
  `).all();
  res.json(employees);
});

// Create employee (admin only)
router.post('/', adminOnly, (req, res) => {
  const { employeeId, name, email, password, phone, department, designation, joiningDate, managerId, role } = req.body;
  if (!employeeId || !name || !email || !password) {
    return res.status(400).json({ error: 'Required fields: employeeId, name, email, password' });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(`
      INSERT INTO employees (employeeId, name, email, password, phone, department, designation, joiningDate, managerId, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(employeeId, name, email, hash, phone, department, designation, joiningDate, managerId || null, role || 'employee');

    // Assign default leave balances
    const leaveTypes = db.prepare('SELECT id, defaultBalance FROM leave_types').all();
    const insertLB = db.prepare('INSERT INTO leave_balances (employeeId, leaveTypeId, total, used) VALUES (?, ?, ?, 0)');
    leaveTypes.forEach(lt => insertLB.run(result.lastInsertRowid, lt.id, lt.defaultBalance));

    res.status(201).json({ id: result.lastInsertRowid, message: 'Employee created' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Employee ID or email already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

// Update employee (admin only)
router.put('/:id', adminOnly, (req, res) => {
  const { name, email, phone, department, designation, joiningDate, managerId, role, status } = req.body;
  try {
    db.prepare(`
      UPDATE employees SET name=?, email=?, phone=?, department=?, designation=?, joiningDate=?, managerId=?, role=?, status=?
      WHERE id=?
    `).run(name, email, phone, department, designation, joiningDate, managerId || null, role, status || 'active', req.params.id);
    res.json({ message: 'Employee updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete employee (admin only)
router.delete('/:id', adminOnly, (req, res) => {
  db.prepare('UPDATE employees SET status = ? WHERE id = ?').run('inactive', req.params.id);
  res.json({ message: 'Employee deactivated' });
});

// Dashboard stats
router.get('/stats/dashboard', (req, res) => {
  const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE status='active'").get().count;
  const departments = db.prepare("SELECT COUNT(DISTINCT department) as count FROM employees WHERE status='active'").get().count;
  const today = new Date().toISOString().split('T')[0];
  const presentToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date=? AND status IN ('present','late')").get(today).count;
  const pendingLeaves = db.prepare("SELECT COUNT(*) as count FROM leave_applications WHERE status='pending'").get().count;
  const onLeaveToday = db.prepare("SELECT COUNT(*) as count FROM leave_applications WHERE status='approved' AND fromDate <= ? AND toDate >= ?").get(today, today).count;

  res.json({ totalEmployees, departments, presentToday, pendingLeaves, onLeaveToday });
});

module.exports = router;
