const express = require('express');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const CATEGORIES = ['Identity', 'Education', 'Experience', 'Policy', 'Contract', 'Certificate', 'Other'];

// Get my documents
router.get('/my', (req, res) => {
  try {
    const docs = db.prepare(`
      SELECT d.*, u.name as uploadedByName FROM documents d
      LEFT JOIN employees u ON d.uploadedBy = u.id
      WHERE d.employeeId = ? ORDER BY d.createdAt DESC
    `).all(req.user.id);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get company documents (visible to all)
router.get('/company', (req, res) => {
  try {
    const docs = db.prepare(`
      SELECT d.*, u.name as uploadedByName FROM documents d
      LEFT JOIN employees u ON d.uploadedBy = u.id
      WHERE d.isCompanyDoc = 1 ORDER BY d.createdAt DESC
    `).all();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all documents (admin)
router.get('/all', adminOnly, (req, res) => {
  try {
    const docs = db.prepare(`
      SELECT d.*, u.name as uploadedByName, e.name as employeeName FROM documents d
      LEFT JOIN employees u ON d.uploadedBy = u.id
      LEFT JOIN employees e ON d.employeeId = e.id
      WHERE d.isCompanyDoc = 0
      ORDER BY d.createdAt DESC
    `).all();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get documents for employee (admin)
router.get('/employee/:employeeId', adminOnly, (req, res) => {
  try {
    const docs = db.prepare(`
      SELECT d.*, u.name as uploadedByName FROM documents d
      LEFT JOIN employees u ON d.uploadedBy = u.id
      WHERE d.employeeId = ? ORDER BY d.createdAt DESC
    `).all(req.params.employeeId);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload document
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { category, employeeId, isCompanyDoc } = req.body;
    const targetEmpId = isCompanyDoc === 'true' ? null : (employeeId || req.user.id);

    const result = db.prepare('INSERT INTO documents (employeeId, name, category, filePath, fileSize, uploadedBy, isCompanyDoc) VALUES (?,?,?,?,?,?,?)')
      .run(targetEmpId, req.file.originalname, category || 'Other', req.file.filename, req.file.size, req.user.id, isCompanyDoc === 'true' ? 1 : 0);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Document uploaded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download document
router.get('/download/:id', (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // Check access: own doc, company doc, or admin
    if (!doc.isCompanyDoc && doc.employeeId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.join(uploadsDir, doc.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath, doc.name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete document
router.delete('/:id', (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.uploadedBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file
    const filePath = path.join(uploadsDir, doc.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
    res.json({ message: 'Document deleted' });
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

module.exports = router;
