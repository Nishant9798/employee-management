const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all onboarding task templates
router.get('/tasks', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM onboarding_tasks ORDER BY sortOrder').all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get onboarding progress for an employee (self, manager, or admin)
router.get('/progress/:employeeId', (req, res) => {
  try {
    // Only allow viewing own progress, team member's progress (manager), or any (admin)
    if (req.user.role === 'employee' && String(req.params.employeeId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only view your own onboarding progress' });
    }
    if (req.user.role === 'manager' && String(req.params.employeeId) !== String(req.user.id)) {
      const emp = db.prepare('SELECT managerId FROM employees WHERE id = ?').get(req.params.employeeId);
      if (!emp || emp.managerId !== req.user.id) {
        return res.status(403).json({ error: 'You can only view onboarding progress for your team members' });
      }
    }

    const progress = db.prepare(`
      SELECT ot.*, COALESCE(op.status, 'pending') as progressStatus, op.completedAt, op.notes
      FROM onboarding_tasks ot
      LEFT JOIN onboarding_progress op ON ot.id = op.taskId AND op.employeeId = ?
      ORDER BY ot.sortOrder
    `).all(req.params.employeeId);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all employees with onboarding status (admin)
router.get('/all', adminOnly, (req, res) => {
  try {
    const employees = db.prepare(`
      SELECT e.id, e.employeeId, e.name, e.department, e.joiningDate,
        (SELECT COUNT(*) FROM onboarding_tasks) as totalTasks,
        (SELECT COUNT(*) FROM onboarding_progress WHERE employeeId = e.id AND status = 'completed') as completedTasks
      FROM employees e WHERE e.status = 'active'
      ORDER BY e.joiningDate DESC
    `).all();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize onboarding for employee (admin)
router.post('/initialize/:employeeId', adminOnly, (req, res) => {
  try {
    const tasks = db.prepare('SELECT id FROM onboarding_tasks').all();
    const insert = db.prepare('INSERT OR IGNORE INTO onboarding_progress (employeeId, taskId) VALUES (?,?)');
    tasks.forEach(t => insert.run(req.params.employeeId, t.id));
    res.json({ message: 'Onboarding initialized' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task progress (own or admin)
router.put('/progress/:employeeId/:taskId', (req, res) => {
  try {
    // Only allow updating own onboarding tasks, or admin can update any
    if (req.user.role !== 'admin' && String(req.params.employeeId) !== String(req.user.id)) {
      return res.status(403).json({ error: 'You can only update your own onboarding tasks' });
    }
    const { status, notes } = req.body;
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    db.prepare(`INSERT INTO onboarding_progress (employeeId, taskId, status, completedAt, notes) VALUES (?,?,?,?,?)
      ON CONFLICT(employeeId, taskId) DO UPDATE SET status=?, completedAt=?, notes=?`)
      .run(req.params.employeeId, req.params.taskId, status, completedAt, notes, status, completedAt, notes);
    res.json({ message: 'Progress updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create onboarding task template (admin)
router.post('/tasks', adminOnly, (req, res) => {
  try {
    const { title, description, category, assignTo, daysToComplete, sortOrder } = req.body;
    const result = db.prepare('INSERT INTO onboarding_tasks (title, description, category, assignTo, daysToComplete, sortOrder) VALUES (?,?,?,?,?,?)')
      .run(title, description, category, assignTo, daysToComplete, sortOrder || 0);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
