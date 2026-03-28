const express = require('express');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'policies');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const CATEGORIES = ['General', 'HR', 'IT', 'Finance', 'Security', 'Compliance', 'Leave', 'Travel', 'Other'];

// Get all policies (all employees can view)
router.get('/', (req, res) => {
  const policies = db.prepare(`
    SELECT p.*, u.name as uploadedByName, e.name as updatedByName
    FROM company_policies p
    LEFT JOIN employees u ON p.uploadedBy = u.id
    LEFT JOIN employees e ON p.updatedBy = e.id
    ORDER BY p.updatedAt DESC
  `).all();
  res.json(policies);
});

// Get categories
router.get('/categories', (req, res) => res.json(CATEGORIES));

// Upload new policy (admin only)
router.post('/', adminOnly, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { title, description, category } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = db.prepare(
    'INSERT INTO company_policies (title, description, category, filePath, fileName, fileSize, uploadedBy) VALUES (?,?,?,?,?,?,?)'
  ).run(title, description || '', category || 'General', req.file.filename, req.file.originalname, req.file.size, req.user.id);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Policy uploaded successfully' });
});

// Update policy (admin only) - can update details and/or file
router.put('/:id', adminOnly, upload.single('file'), (req, res) => {
  const policy = db.prepare('SELECT * FROM company_policies WHERE id = ?').get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  const { title, description, category } = req.body;

  if (req.file) {
    // Delete old file
    const oldPath = path.join(uploadsDir, policy.filePath);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

    db.prepare(
      'UPDATE company_policies SET title=?, description=?, category=?, filePath=?, fileName=?, fileSize=?, updatedBy=?, updatedAt=datetime("now") WHERE id=?'
    ).run(title || policy.title, description ?? policy.description, category || policy.category, req.file.filename, req.file.originalname, req.file.size, req.user.id, req.params.id);
  } else {
    db.prepare(
      'UPDATE company_policies SET title=?, description=?, category=?, updatedBy=?, updatedAt=datetime("now") WHERE id=?'
    ).run(title || policy.title, description ?? policy.description, category || policy.category, req.user.id, req.params.id);
  }

  res.json({ message: 'Policy updated successfully' });
});

// Download policy file (all employees)
router.get('/download/:id', (req, res) => {
  const policy = db.prepare('SELECT * FROM company_policies WHERE id = ?').get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  const filePath = path.join(uploadsDir, policy.filePath);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath, policy.fileName);
});

// Delete policy (admin only)
router.delete('/:id', adminOnly, (req, res) => {
  const policy = db.prepare('SELECT * FROM company_policies WHERE id = ?').get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  const filePath = path.join(uploadsDir, policy.filePath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM company_policies WHERE id = ?').run(req.params.id);
  res.json({ message: 'Policy deleted successfully' });
});

module.exports = router;
