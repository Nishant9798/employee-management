const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get my notifications
router.get('/', (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50
  `).all(req.user.id);
  res.json(notifications);
});

// Get unread count
router.get('/unread-count', (req, res) => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0').get(req.user.id);
  res.json({ count });
});

// Mark as read
router.put('/read/:id', (req, res) => {
  db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Marked as read' });
});

// Mark all as read
router.put('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET isRead = 1 WHERE userId = ?').run(req.user.id);
  res.json({ message: 'All marked as read' });
});

// Delete notification
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;

// Helper to create notification (used by other routes)
module.exports.createNotification = (userId, title, message, type = 'info', link = null) => {
  db.prepare('INSERT INTO notifications (userId, title, message, type, link) VALUES (?,?,?,?,?)').run(userId, title, message, type, link);
};
