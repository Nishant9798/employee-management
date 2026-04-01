const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get conversations (unique chat partners)
router.get('/conversations', (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT e.id, e.name, e.department, e.designation, e.employeeId as empCode,
        (SELECT content FROM messages WHERE (senderId = e.id AND receiverId = ? OR senderId = ? AND receiverId = e.id) AND channel IS NULL ORDER BY createdAt DESC LIMIT 1) as lastMessage,
        (SELECT createdAt FROM messages WHERE (senderId = e.id AND receiverId = ? OR senderId = ? AND receiverId = e.id) AND channel IS NULL ORDER BY createdAt DESC LIMIT 1) as lastMessageAt,
        (SELECT COUNT(*) FROM messages WHERE senderId = e.id AND receiverId = ? AND isRead = 0 AND channel IS NULL) as unreadCount
      FROM employees e
      WHERE e.id != ? AND e.status = 'active'
      AND e.id IN (
        SELECT DISTINCT CASE WHEN senderId = ? THEN receiverId ELSE senderId END
        FROM messages WHERE (senderId = ? OR receiverId = ?) AND channel IS NULL
      )
      ORDER BY lastMessageAt DESC
    `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages with a user
router.get('/direct/:userId', (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT m.*, s.name as senderName FROM messages m
      JOIN employees s ON m.senderId = s.id
      WHERE channel IS NULL AND ((m.senderId = ? AND m.receiverId = ?) OR (m.senderId = ? AND m.receiverId = ?))
      ORDER BY m.createdAt ASC LIMIT 100
    `).all(req.user.id, req.params.userId, req.params.userId, req.user.id);

    // Mark as read
    db.prepare('UPDATE messages SET isRead = 1 WHERE senderId = ? AND receiverId = ? AND isRead = 0 AND channel IS NULL')
      .run(req.params.userId, req.user.id);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get channel messages
router.get('/channel/:channelName', (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT m.*, s.name as senderName FROM messages m
      JOIN employees s ON m.senderId = s.id
      WHERE m.channel = ? ORDER BY m.createdAt ASC LIMIT 100
    `).all(req.params.channelName);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
router.post('/send', (req, res) => {
  try {
    const { receiverId, channel, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    if (!receiverId && !channel) return res.status(400).json({ error: 'Receiver or channel required' });

    const result = db.prepare('INSERT INTO messages (senderId, receiverId, channel, content) VALUES (?,?,?,?)')
      .run(req.user.id, receiverId || null, channel || null, content);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get channels
router.get('/channels', (req, res) => {
  try {
    const channels = db.prepare(`
      SELECT DISTINCT channel, COUNT(*) as messageCount,
        (SELECT content FROM messages m2 WHERE m2.channel = messages.channel ORDER BY createdAt DESC LIMIT 1) as lastMessage
      FROM messages WHERE channel IS NOT NULL GROUP BY channel ORDER BY channel
    `).all();
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all employees for starting new chat
router.get('/contacts', (req, res) => {
  try {
    const contacts = db.prepare(`
      SELECT id, name, department, designation, employeeId as empCode FROM employees WHERE status = 'active' AND id != ? ORDER BY name
    `).all(req.user.id);
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unread count
router.get('/unread-count', (req, res) => {
  try {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM messages WHERE receiverId = ? AND isRead = 0 AND channel IS NULL').get(req.user.id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
