const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const holidays = db.prepare('SELECT * FROM holidays ORDER BY date').all();
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', adminOnly, (req, res) => {
  try {
    const { name, date, type } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'Name and date required' });
    const result = db.prepare('INSERT INTO holidays (name, date, type) VALUES (?, ?, ?)').run(name, date, type || 'national');
    res.status(201).json({ id: result.lastInsertRowid, message: 'Holiday added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', adminOnly, (req, res) => {
  try {
    const { name, date, type } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'Name and date required' });
    db.prepare('UPDATE holidays SET name=?, date=?, type=? WHERE id=?').run(name, date, type, req.params.id);
    res.json({ message: 'Holiday updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', adminOnly, (req, res) => {
  try {
    db.prepare('DELETE FROM holidays WHERE id=?').run(req.params.id);
    res.json({ message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
