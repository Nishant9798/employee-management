const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const CATEGORIES = ['Hardware', 'Software', 'Furniture', 'Vehicle', 'Accessory', 'Other'];

// Get all assets (admin sees all, employee sees own)
router.get('/', (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const assets = db.prepare(`
        SELECT a.*, e.name as assignedToName, e.employeeId as assignedToEmpId, e.department
        FROM assets a LEFT JOIN employees e ON a.assignedTo = e.id
        ORDER BY a.createdAt DESC
      `).all();
      return res.json(assets);
    }
    const assets = db.prepare(`
      SELECT * FROM assets WHERE assignedTo = ? AND status = 'assigned' ORDER BY assignedDate DESC
    `).all(req.user.id);
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get categories
router.get('/categories', (req, res) => {
  try {
    res.json(CATEGORIES);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create asset (admin)
router.post('/', adminOnly, (req, res) => {
  const { assetId, name, category, serialNumber, purchaseDate, purchaseCost, condition, notes } = req.body;
  if (!assetId || !name) return res.status(400).json({ error: 'Asset ID and name required' });
  try {
    const result = db.prepare(
      'INSERT INTO assets (assetId, name, category, serialNumber, purchaseDate, purchaseCost, condition, notes) VALUES (?,?,?,?,?,?,?,?)'
    ).run(assetId, name, category || 'Hardware', serialNumber, purchaseDate, purchaseCost, condition || 'new', notes);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Asset created' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Asset ID already exists' });
    res.status(500).json({ error: e.message });
  }
});

// Update asset (admin)
router.put('/:id', adminOnly, (req, res) => {
  try {
    const { name, category, serialNumber, purchaseDate, purchaseCost, condition, notes } = req.body;
    db.prepare('UPDATE assets SET name=?, category=?, serialNumber=?, purchaseDate=?, purchaseCost=?, condition=?, notes=? WHERE id=?')
      .run(name, category, serialNumber, purchaseDate, purchaseCost, condition, notes, req.params.id);
    res.json({ message: 'Asset updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign asset to employee (admin)
router.put('/:id/assign', adminOnly, (req, res) => {
  try {
    const { employeeId } = req.body;
    db.prepare("UPDATE assets SET assignedTo=?, assignedDate=date('now'), returnDate=NULL, status='assigned' WHERE id=?")
      .run(employeeId, req.params.id);
    res.json({ message: 'Asset assigned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Return asset (admin)
router.put('/:id/return', adminOnly, (req, res) => {
  try {
    const { condition } = req.body;
    db.prepare("UPDATE assets SET assignedTo=NULL, returnDate=date('now'), status='available', condition=? WHERE id=?")
      .run(condition || 'good', req.params.id);
    res.json({ message: 'Asset returned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete asset (admin)
router.delete('/:id', adminOnly, (req, res) => {
  try {
    db.prepare(`UPDATE assets SET status = 'retired' WHERE id = ?`).run(req.params.id);
    res.json({ message: 'Asset retired' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats
router.get('/stats', adminOnly, (req, res) => {
  try {
    const total = db.prepare(`SELECT COUNT(*) as c FROM assets WHERE status != 'retired'`).get().c;
    const assigned = db.prepare(`SELECT COUNT(*) as c FROM assets WHERE status = 'assigned'`).get().c;
    const available = db.prepare(`SELECT COUNT(*) as c FROM assets WHERE status = 'available'`).get().c;
    const maintenance = db.prepare(`SELECT COUNT(*) as c FROM assets WHERE status = 'maintenance'`).get().c;
    const totalValue = db.prepare(`SELECT COALESCE(SUM(purchaseCost), 0) as v FROM assets WHERE status != 'retired'`).get().v;
    res.json({ total, assigned, available, maintenance, totalValue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
