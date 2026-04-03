const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly, managerOrAdmin } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();
router.use(authMiddleware);

// Get all programs
router.get('/programs', (req, res) => {
  try {
    const programs = db.prepare(`
      SELECT tp.*, e.name as createdByName,
        (SELECT COUNT(*) FROM training_enrollments WHERE programId = tp.id) as enrolled
      FROM training_programs tp LEFT JOIN employees e ON tp.createdBy = e.id ORDER BY tp.startDate DESC
    `).all();
    res.json(programs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my enrollments
router.get('/my-enrollments', (req, res) => {
  try {
    const enrollments = db.prepare(`
      SELECT te.*, tp.title, tp.description, tp.startDate, tp.endDate, tp.instructor, tp.mode, tp.category, tp.status as programStatus
      FROM training_enrollments te JOIN training_programs tp ON te.programId = tp.id
      WHERE te.employeeId = ? ORDER BY te.enrolledAt DESC
    `).all(req.user.id);
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my skills
router.get('/my-skills', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM skills WHERE employeeId = ? ORDER BY name').all(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get skills for employee
router.get('/skills/:employeeId', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM skills WHERE employeeId = ? ORDER BY name').all(req.params.employeeId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add/update skill
router.post('/skills', (req, res) => {
  const { name, level } = req.body;
  if (!name) return res.status(400).json({ error: 'Skill name required' });
  try {
    db.prepare('INSERT INTO skills (employeeId, name, level) VALUES (?,?,?) ON CONFLICT(employeeId, name) DO UPDATE SET level = ?')
      .run(req.user.id, name, level || 'beginner', level || 'beginner');
    res.json({ message: 'Skill saved' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete skill
router.delete('/skills/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM skills WHERE id = ? AND employeeId = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Skill removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create program (admin)
router.post('/programs', adminOnly, (req, res) => {
  try {
    const { title, description, instructor, startDate, endDate, maxParticipants, category, mode } = req.body;
    const result = db.prepare('INSERT INTO training_programs (title, description, instructor, startDate, endDate, maxParticipants, category, mode, createdBy) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(title, description, instructor, startDate, endDate, maxParticipants, category, mode || 'online', req.user.id);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enroll in program
router.post('/enroll/:programId', (req, res) => {
  try {
    const program = db.prepare('SELECT * FROM training_programs WHERE id = ?').get(req.params.programId);
    if (!program) return res.status(404).json({ error: 'Training program not found' });
    if (program.status === 'cancelled') return res.status(400).json({ error: 'This program has been cancelled' });
    if (program.status === 'completed') return res.status(400).json({ error: 'This program has already completed' });

    // Check max participants
    if (program.maxParticipants) {
      const enrolled = db.prepare("SELECT COUNT(*) as c FROM training_enrollments WHERE programId = ? AND status != 'dropped'").get(req.params.programId).c;
      if (enrolled >= program.maxParticipants) return res.status(400).json({ error: 'Program is full' });
    }

    db.prepare('INSERT INTO training_enrollments (programId, employeeId) VALUES (?,?)').run(req.params.programId, req.user.id);
    res.json({ message: 'Enrolled successfully' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Already enrolled' });
    res.status(500).json({ error: e.message });
  }
});

// Complete enrollment (admin)
router.put('/complete-enrollment/:id', adminOnly, (req, res) => {
  try {
    const { feedback, rating } = req.body;
    db.prepare(`UPDATE training_enrollments SET status = ?, completionDate = datetime('now'), feedback = ?, rating = ? WHERE id = ?`)
      .run('completed', feedback, rating, req.params.id);
    res.json({ message: 'Marked as completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get enrollments for a program (admin)
router.get('/program-enrollments/:programId', adminOnly, (req, res) => {
  try {
    const enrollments = db.prepare(`
      SELECT te.*, e.name, e.department, e.employeeId as empCode
      FROM training_enrollments te JOIN employees e ON te.employeeId = e.id
      WHERE te.programId = ? ORDER BY e.name
    `).all(req.params.programId);
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
