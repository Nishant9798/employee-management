const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all onboarding task templates
router.get('/tasks', (req, res) => {
  res.json(db.prepare('SELECT * FROM onboarding_tasks ORDER BY sortOrder').all());
});

// Get onboarding progress for an employee
router.get('/progress/:employeeId', (req, res) => {
  const progress = db.prepare(`
    SELECT ot.*, COALESCE(op.status, 'pending') as progressStatus, op.completedAt, op.notes
    FROM onboarding_tasks ot
    LEFT JOIN onboarding_progress op ON ot.id = op.taskId AND op.employeeId = ?
    ORDER BY ot.sortOrder
  `).all(req.params.employeeId);
  res.json(progress);
});

// Get all employees with onboarding status (admin)
router.get('/all', adminOnly, (req, res) => {
  const employees = db.prepare(`
    SELECT e.id, e.employeeId, e.name, e.department, e.joiningDate,
      (SELECT COUNT(*) FROM onboarding_tasks) as totalTasks,
      (SELECT COUNT(*) FROM onboarding_progress WHERE employeeId = e.id AND status = 'completed') as completedTasks
    FROM employees e WHERE e.status = 'active'
    ORDER BY e.joiningDate DESC
  `).all();
  res.json(employees);
});

// Initialize onboarding for employee (admin)
router.post('/initialize/:employeeId', adminOnly, (req, res) => {
  const tasks = db.prepare('SELECT id FROM onboarding_tasks').all();
  const insert = db.prepare('INSERT OR IGNORE INTO onboarding_progress (employeeId, taskId) VALUES (?,?)');
  tasks.forEach(t => insert.run(req.params.employeeId, t.id));
  res.json({ message: 'Onboarding initialized' });
});

// Update task progress
router.put('/progress/:employeeId/:taskId', (req, res) => {
  const { status, notes } = req.body;
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  db.prepare(`INSERT INTO onboarding_progress (employeeId, taskId, status, completedAt, notes) VALUES (?,?,?,?,?)
    ON CONFLICT(employeeId, taskId) DO UPDATE SET status=?, completedAt=?, notes=?`)
    .run(req.params.employeeId, req.params.taskId, status, completedAt, notes, status, completedAt, notes);
  res.json({ message: 'Progress updated' });
});

// Create onboarding task template (admin)
router.post('/tasks', adminOnly, (req, res) => {
  const { title, description, category, assignTo, daysToComplete, sortOrder } = req.body;
  const result = db.prepare('INSERT INTO onboarding_tasks (title, description, category, assignTo, daysToComplete, sortOrder) VALUES (?,?,?,?,?,?)')
    .run(title, description, category, assignTo, daysToComplete, sortOrder || 0);
  res.status(201).json({ id: result.lastInsertRowid });
});

module.exports = router;
