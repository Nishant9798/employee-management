const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all settings
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM company_settings ORDER BY category, key').all();
    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = {};
      grouped[s.category][s.key] = s.value;
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update setting (admin)
router.put('/:key', adminOnly, (req, res) => {
  try {
    const { value } = req.body;
    // Only update existing keys
    const existing = db.prepare('SELECT id FROM company_settings WHERE key = ?').get(req.params.key);
    if (!existing) return res.status(404).json({ error: 'Setting not found' });
    db.prepare('UPDATE company_settings SET value = ? WHERE key = ?').run(String(value).slice(0, 1000), req.params.key);
    res.json({ message: 'Setting updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update settings (admin)
router.put('/', adminOnly, (req, res) => {
  try {
    const settings = req.body;
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: 'Invalid settings format' });
    }

    // Only update keys that already exist in the database
    const existingKeys = new Set(db.prepare('SELECT key FROM company_settings').all().map(s => s.key));
    const stmt = db.prepare('UPDATE company_settings SET value = ? WHERE key = ?');
    let updated = 0;
    Object.entries(settings).forEach(([key, value]) => {
      if (existingKeys.has(key)) {
        stmt.run(String(value).slice(0, 1000), key);
        updated++;
      }
    });
    res.json({ message: `${updated} settings updated` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activity log
router.get('/activity-log', adminOnly, (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const logs = db.prepare(`
      SELECT al.*, e.name as userName, e.employeeId as empCode
      FROM activity_log al LEFT JOIN employees e ON al.userId = e.id
      ORDER BY al.createdAt DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM activity_log').get().count;
    res.json({ logs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Global search
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 2) return res.json({ employees: [], announcements: [], leaves: [] });
    if (q.length > 100) return res.status(400).json({ error: 'Search query too long' });

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
