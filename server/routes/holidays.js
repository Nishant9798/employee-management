const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const holidays = db.prepare('SELECT * FROM holidays ORDER BY date').all();
  res.json(holidays);
});

router.post('/', adminOnly, (req, res) => {
  const { name, date, type } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'Name and date required' });
  const result = db.prepare('INSERT INTO holidays (name, date, type) VALUES (?, ?, ?)').run(name, date, type || 'national');
  res.status(201).json({ id: result.lastInsertRowid, message: 'Holiday added' });
});

router.put('/:id', adminOnly, (req, res) => {
  const { name, date, type } = req.body;
  db.prepare('UPDATE holidays SET name=?, date=?, type=? WHERE id=?').run(name, date, type, req.params.id);
  res.json({ message: 'Holiday updated' });
});

router.delete('/:id', adminOnly, (req, res) => {
  db.prepare('DELETE FROM holidays WHERE id=?').run(req.params.id);
  res.json({ message: 'Holiday deleted' });
});

module.exports = router;
