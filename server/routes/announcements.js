const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all announcements
router.get('/', (req, res) => {
  const announcements = db.prepare(`
    SELECT a.*, e.name as authorName
    FROM announcements a LEFT JOIN employees e ON a.createdBy = e.id
    ORDER BY a.createdAt DESC
  `).all();
  res.json(announcements);
});

// Create announcement (admin only)
router.post('/', adminOnly, (req, res) => {
  const { title, content, priority } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  const result = db.prepare('INSERT INTO announcements (title, content, priority, createdBy) VALUES (?, ?, ?, ?)')
    .run(title, content, priority || 'normal', req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Announcement created' });
});

// Update announcement (admin only)
router.put('/:id', adminOnly, (req, res) => {
  const { title, content, priority } = req.body;
  db.prepare('UPDATE announcements SET title=?, content=?, priority=? WHERE id=?')
    .run(title, content, priority, req.params.id);
  res.json({ message: 'Announcement updated' });
});

// Delete announcement (admin only)
router.delete('/:id', adminOnly, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
  res.json({ message: 'Announcement deleted' });
});

module.exports = router;
