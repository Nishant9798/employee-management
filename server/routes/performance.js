const express = require('express');
const db = require('../db');
const { authMiddleware, managerOrAdmin, adminOnly } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();
router.use(authMiddleware);

// Get my reviews
router.get('/my-reviews', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT pr.*, e.name as reviewerName FROM performance_reviews pr
      JOIN employees e ON pr.reviewerId = e.id WHERE pr.employeeId = ? ORDER BY pr.createdAt DESC
    `).all(req.user.id);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my goals
router.get('/my-goals', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM goals WHERE employeeId = ? ORDER BY createdAt DESC').all(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get team reviews (manager)
router.get('/team-reviews', managerOrAdmin, (req, res) => {
  try {
    let query = `
      SELECT pr.*, e.name as employeeName, e.department, e.employeeId as empCode, r.name as reviewerName
      FROM performance_reviews pr
      JOIN employees e ON pr.employeeId = e.id
      JOIN employees r ON pr.reviewerId = r.id
    `;
    const params = [];
    if (req.user.role === 'manager') {
      query += ` WHERE pr.employeeId IN (SELECT id FROM employees WHERE managerId = ?)`;
      params.push(req.user.id);
    }
    query += ' ORDER BY pr.createdAt DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create review (manager/admin)
router.post('/review', managerOrAdmin, (req, res) => {
  try {
    const { employeeId, reviewPeriod } = req.body;
    if (!employeeId || !reviewPeriod) return res.status(400).json({ error: 'Employee and review period required' });

    const result = db.prepare('INSERT INTO performance_reviews (employeeId, reviewerId, reviewPeriod) VALUES (?,?,?)')
      .run(employeeId, req.user.id, reviewPeriod);

    createNotification(employeeId, 'Performance Review Started', `Your ${reviewPeriod} performance review has been initiated`, 'performance', '/performance');
    res.status(201).json({ id: result.lastInsertRowid, message: 'Review created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit self-review
router.put('/self-review/:id', (req, res) => {
  try {
    const { selfRating, selfComments } = req.body;
    const review = db.prepare('SELECT * FROM performance_reviews WHERE id = ? AND employeeId = ?').get(req.params.id, req.user.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    db.prepare('UPDATE performance_reviews SET selfRating = ?, selfComments = ?, status = ? WHERE id = ?')
      .run(selfRating, selfComments, 'manager_review', req.params.id);

    createNotification(review.reviewerId, 'Self-Review Submitted', `${req.user.name} has submitted their self-review`, 'performance', '/performance');
    res.json({ message: 'Self-review submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete review (manager)
router.put('/complete-review/:id', managerOrAdmin, (req, res) => {
  try {
    const { rating, strengths, improvements, goals, comments } = req.body;
    const review = db.prepare('SELECT * FROM performance_reviews WHERE id = ?').get(req.params.id);
    if (!review) return res.status(404).json({ error: 'Not found' });

    db.prepare('UPDATE performance_reviews SET rating = ?, strengths = ?, improvements = ?, goals = ?, comments = ?, status = ? WHERE id = ?')
      .run(rating, strengths, improvements, goals, comments, 'completed', req.params.id);

    createNotification(review.employeeId, 'Performance Review Completed', `Your ${review.reviewPeriod} review has been completed. Rating: ${rating}/5`, 'performance', '/performance');
    res.json({ message: 'Review completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD Goals
router.post('/goals', (req, res) => {
  try {
    const { title, description, category, targetDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const result = db.prepare('INSERT INTO goals (employeeId, title, description, category, targetDate) VALUES (?,?,?,?,?)')
      .run(req.user.id, title, description, category || 'performance', targetDate);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/goals/:id', (req, res) => {
  try {
    const { title, description, progress, status, category, targetDate } = req.body;
    db.prepare('UPDATE goals SET title=?, description=?, progress=?, status=?, category=?, targetDate=? WHERE id=? AND employeeId=?')
      .run(title, description, progress, status, category, targetDate, req.params.id, req.user.id);
    res.json({ message: 'Goal updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/goals/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM goals WHERE id = ? AND employeeId = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Team goals (manager)
router.get('/team-goals', managerOrAdmin, (req, res) => {
  try {
    let query = `SELECT g.*, e.name as employeeName, e.department FROM goals g JOIN employees e ON g.employeeId = e.id`;
    const gParams = [];
    if (req.user.role === 'manager') {
      query += ` WHERE g.employeeId IN (SELECT id FROM employees WHERE managerId = ?)`;
      gParams.push(req.user.id);
    }
    query += ' ORDER BY g.createdAt DESC';
    res.json(db.prepare(query).all(...gParams));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
