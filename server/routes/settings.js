const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all settings
router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM company_settings ORDER BY category, key').all();
  const grouped = {};
  settings.forEach(s => {
    if (!grouped[s.category]) grouped[s.category] = {};
    grouped[s.category][s.key] = s.value;
  });
  res.json(grouped);
});

// Update setting (admin)
router.put('/:key', adminOnly, (req, res) => {
  const { value } = req.body;
  db.prepare('UPDATE company_settings SET value = ? WHERE key = ?').run(value, req.params.key);
  res.json({ message: 'Setting updated' });
});

// Bulk update settings (admin)
router.put('/', adminOnly, (req, res) => {
  const settings = req.body;
  const stmt = db.prepare('UPDATE company_settings SET value = ? WHERE key = ?');
  Object.entries(settings).forEach(([key, value]) => stmt.run(value, key));
  res.json({ message: 'Settings updated' });
});

// Activity log
router.get('/activity-log', adminOnly, (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  const logs = db.prepare(`
    SELECT al.*, e.name as userName, e.employeeId as empCode
    FROM activity_log al LEFT JOIN employees e ON al.userId = e.id
    ORDER BY al.createdAt DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM activity_log').get().count;
  res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
});

// Global search
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ employees: [], announcements: [], leaves: [] });

  const searchTerm = `%${q}%`;
  const employees = db.prepare(`
    SELECT id, employeeId, name, department, designation, email FROM employees
    WHERE status = 'active' AND (name LIKE ? OR employeeId LIKE ? OR email LIKE ? OR department LIKE ?)
    LIMIT 10
  `).all(searchTerm, searchTerm, searchTerm, searchTerm);

  const announcements = db.prepare(`
    SELECT id, title, priority FROM announcements WHERE title LIKE ? OR content LIKE ? LIMIT 5
  `).all(searchTerm, searchTerm);

  res.json({ employees, announcements });
});

module.exports = router;
