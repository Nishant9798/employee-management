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
           e.joiningDate, e.managerId, e.role, e.avatar, e.status, e.dateOfBirth, e.bloodGroup, e.gender,
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
           e.joiningDate, e.managerId, e.role, e.avatar, e.status, e.dateOfBirth, e.bloodGroup,
           e.gender, e.address, e.emergencyContactName, e.emergencyContactPhone,
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
  const { employeeId, name, email, password, phone, department, designation, joiningDate, managerId, role, dateOfBirth, bloodGroup, gender, address, emergencyContactName, emergencyContactPhone } = req.body;
  if (!employeeId || !name || !email || !password) {
    return res.status(400).json({ error: 'Required fields: employeeId, name, email, password' });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(`
      INSERT INTO employees (employeeId, name, email, password, phone, department, designation, joiningDate, managerId, role, dateOfBirth, bloodGroup, gender, address, emergencyContactName, emergencyContactPhone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(employeeId, name, email, hash, phone, department, designation, joiningDate, managerId || null, role || 'employee', dateOfBirth, bloodGroup, gender, address, emergencyContactName, emergencyContactPhone);

    // Assign default leave balances
    const leaveTypes = db.prepare('SELECT id, defaultBalance FROM leave_types').all();
    const insertLB = db.prepare('INSERT INTO leave_balances (employeeId, leaveTypeId, total, used) VALUES (?, ?, ?, 0)');
    leaveTypes.forEach(lt => insertLB.run(result.lastInsertRowid, lt.id, lt.defaultBalance));

    // Initialize onboarding
    const tasks = db.prepare('SELECT id FROM onboarding_tasks').all();
    const insertOp = db.prepare('INSERT OR IGNORE INTO onboarding_progress (employeeId, taskId) VALUES (?,?)');
    tasks.forEach(t => insertOp.run(result.lastInsertRowid, t.id));

    // Assign default shift
    const defaultShift = db.prepare('SELECT id FROM shifts LIMIT 1').get();
    if (defaultShift) {
      db.prepare('INSERT INTO employee_shifts (employeeId, shiftId, fromDate) VALUES (?,?,?)').run(result.lastInsertRowid, defaultShift.id, new Date().toISOString().split('T')[0]);
    }

    // Log activity
    db.prepare('INSERT INTO activity_log (userId, action, target, details) VALUES (?,?,?,?)').run(req.user.id, 'Created employee', employeeId, `Added ${name} to ${department}`);

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
  const { name, email, phone, department, designation, joiningDate, managerId, role, status, dateOfBirth, bloodGroup, gender, address, emergencyContactName, emergencyContactPhone } = req.body;
  try {
    db.prepare(`
      UPDATE employees SET name=?, email=?, phone=?, department=?, designation=?, joiningDate=?, managerId=?, role=?, status=?, dateOfBirth=?, bloodGroup=?, gender=?, address=?, emergencyContactName=?, emergencyContactPhone=?
      WHERE id=?
    `).run(name, email, phone, department, designation, joiningDate, managerId || null, role, status || 'active', dateOfBirth, bloodGroup, gender, address, emergencyContactName, emergencyContactPhone, req.params.id);
    res.json({ message: 'Employee updated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update own profile (employee self-service)
router.put('/profile/self', (req, res) => {
  const { phone, address, emergencyContactName, emergencyContactPhone, dateOfBirth, bloodGroup } = req.body;
  db.prepare('UPDATE employees SET phone=?, address=?, emergencyContactName=?, emergencyContactPhone=?, dateOfBirth=?, bloodGroup=? WHERE id=?')
    .run(phone, address, emergencyContactName, emergencyContactPhone, dateOfBirth, bloodGroup, req.user.id);
  res.json({ message: 'Profile updated' });
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
  const pendingLeaves = db.prepare("SELECT COUNT(*) as count FROM leave_applications WHERE status IN ('pending_manager','pending_hr')").get().count;
  const onLeaveToday = db.prepare("SELECT COUNT(*) as count FROM leave_applications WHERE status='approved' AND fromDate <= ? AND toDate >= ?").get(today, today).count;
  const pendingExpenses = db.prepare("SELECT COUNT(*) as count FROM expenses WHERE status IN ('pending_manager','pending_finance')").get().count;
  const pendingExits = db.prepare("SELECT COUNT(*) as count FROM exit_requests WHERE status = 'pending'").get().count;

  // Birthdays this month
  const currentMonth = new Date().getMonth() + 1;
  const birthdays = db.prepare(`
    SELECT name, department, dateOfBirth FROM employees
    WHERE status='active' AND dateOfBirth IS NOT NULL AND CAST(strftime('%m', dateOfBirth) AS INTEGER) = ?
    ORDER BY CAST(strftime('%d', dateOfBirth) AS INTEGER)
  `).all(currentMonth);

  // On leave today names
  const onLeaveNames = db.prepare(`
    SELECT e.name, e.department FROM leave_applications la
    JOIN employees e ON la.employeeId = e.id
    WHERE la.status='approved' AND la.fromDate <= ? AND la.toDate >= ?
  `).all(today, today);

  res.json({ totalEmployees, departments, presentToday, pendingLeaves, onLeaveToday, pendingExpenses, pendingExits, birthdays, onLeaveNames });
});


// Analytics data
router.get('/stats/analytics', (req, res) => {
  const deptWise = db.prepare(`
    SELECT department, COUNT(*) as count
    FROM employees WHERE status='active' AND department IS NOT NULL
    GROUP BY department ORDER BY count DESC
  `).all();

  const roleWise = db.prepare(`
    SELECT role, COUNT(*) as count
    FROM employees WHERE status='active'
    GROUP BY role
  `).all();

  const joiningTrend = db.prepare(`
    SELECT strftime('%Y-%m', joiningDate) as month, COUNT(*) as count
    FROM employees WHERE status='active' AND joiningDate IS NOT NULL
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).all().reverse();

  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

  const attendanceTrend = db.prepare(`
    SELECT date,
      SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
    FROM attendance WHERE date BETWEEN ? AND ?
    GROUP BY date ORDER BY date
  `).all(startDate, endDate);

  const leaveUsage = db.prepare(`
    SELECT lt.name, SUM(lb.used) as used, SUM(lb.total) as total
    FROM leave_balances lb JOIN leave_types lt ON lb.leaveTypeId = lt.id
    GROUP BY lt.id
  `).all();

  const topAttendance = db.prepare(`
    SELECT e.name, e.department,
      SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as presentDays
    FROM employees e JOIN attendance a ON e.id = a.employeeId
    WHERE e.status='active' AND a.date BETWEEN ? AND ?
    GROUP BY e.id ORDER BY presentDays DESC LIMIT 5
  `).all(startDate, endDate);

  // Expense stats
  const expenseByCategory = db.prepare(`
    SELECT ec.name as category, COALESCE(SUM(e.amount), 0) as total
    FROM expense_categories ec LEFT JOIN expenses e ON ec.id = e.categoryId AND e.status = 'approved'
    GROUP BY ec.id ORDER BY total DESC
  `).all();

  // Gender distribution
  const genderWise = db.prepare(`
    SELECT COALESCE(gender, 'Not Specified') as gender, COUNT(*) as count
    FROM employees WHERE status='active' GROUP BY gender
  `).all();

  res.json({ deptWise, roleWise, joiningTrend, attendanceTrend, leaveUsage, topAttendance, expenseByCategory, genderWise });
});

// Upcoming birthdays and work anniversaries
router.get('/stats/celebrations', (req, res) => {
  const currentMonth = new Date().getMonth() + 1;

  const anniversaries = db.prepare(`
    SELECT name, department, designation, joiningDate, employeeId,
      (strftime('%Y', 'now') - strftime('%Y', joiningDate)) as years
    FROM employees
    WHERE status='active' AND joiningDate IS NOT NULL
    AND CAST(strftime('%m', joiningDate) AS INTEGER) = ?
    ORDER BY CAST(strftime('%d', joiningDate) AS INTEGER)
  `).all(currentMonth);

  const birthdays = db.prepare(`
    SELECT name, department, dateOfBirth, employeeId
    FROM employees
    WHERE status='active' AND dateOfBirth IS NOT NULL
    AND CAST(strftime('%m', dateOfBirth) AS INTEGER) = ?
    ORDER BY CAST(strftime('%d', dateOfBirth) AS INTEGER)
  `).all(currentMonth);

  res.json({ anniversaries, birthdays });
});

// Export employees CSV
router.get('/export/csv', adminOnly, (req, res) => {
  const employees = db.prepare(`
    SELECT e.employeeId, e.name, e.email, e.phone, e.department, e.designation,
           e.joiningDate, e.role, e.status, e.gender, e.dateOfBirth, e.bloodGroup, m.name as managerName
    FROM employees e LEFT JOIN employees m ON e.managerId = m.id
    WHERE e.status = 'active'
    ORDER BY e.id
  `).all();

  const headers = 'Employee ID,Name,Email,Phone,Department,Designation,Joining Date,Role,Gender,DOB,Blood Group,Manager\n';
  const csv = headers + employees.map(e =>
    `${e.employeeId},${e.name},${e.email},${e.phone || ''},${e.department || ''},${e.designation || ''},${e.joiningDate || ''},${e.role},${e.gender || ''},${e.dateOfBirth || ''},${e.bloodGroup || ''},${e.managerName || ''}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=employees.csv');
  res.send(csv);
});

module.exports = router;
