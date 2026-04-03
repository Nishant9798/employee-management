const express = require('express');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const templatesDir = path.join(__dirname, '..', '..', 'uploads', 'agreements', 'templates');
const submissionsDir = path.join(__dirname, '..', '..', 'uploads', 'agreements', 'submissions');
if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
if (!fs.existsSync(submissionsDir)) fs.mkdirSync(submissionsDir, { recursive: true });

const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, templatesDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
});
const templateUpload = multer({
  storage: templateStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.doc', '.docx', '.pdf', '.odt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only Word documents (.doc, .docx), PDF, and ODT files are allowed'));
  }
});

const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, submissionsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-emp' + req.user.id + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
});
const submissionUpload = multer({
  storage: submissionStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed for submission'));
  }
});

// Get all agreements (with employee's submission status)
router.get('/', (req, res) => {
  try {
    const agreements = db.prepare(`
      SELECT a.*, u.name as uploadedByName
      FROM nda_agreements a
      LEFT JOIN employees u ON a.uploadedBy = u.id
      ORDER BY a.createdAt DESC
    `).all();

    // Get current user's submissions
    const submissions = db.prepare(
      'SELECT * FROM employee_agreements WHERE employeeId = ?'
    ).all(req.user.id);

    const submissionMap = {};
    submissions.forEach(s => { submissionMap[s.agreementId] = s; });

    const result = agreements.map(a => ({
      ...a,
      mySubmission: submissionMap[a.id] || null
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download agreement template (all employees) - MUST be before /:id routes
router.get('/download/:id', (req, res) => {
  try {
    const agreement = db.prepare('SELECT * FROM nda_agreements WHERE id = ?').get(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    const filePath = path.resolve(templatesDir, agreement.templatePath);
    if (!filePath.startsWith(path.resolve(templatesDir))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath, agreement.templateName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download employee's submitted agreement
router.get('/submission/:submissionId/download', (req, res) => {
  try {
    const submission = db.prepare('SELECT * FROM employee_agreements WHERE id = ?').get(req.params.submissionId);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    if (submission.employeeId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.resolve(submissionsDir, submission.filePath);
    if (!filePath.startsWith(path.resolve(submissionsDir))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath, submission.fileName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all submissions for an agreement (admin only)
router.get('/:id/submissions', adminOnly, (req, res) => {
  try {
    const submissions = db.prepare(`
      SELECT ea.*, e.name as employeeName, e.employeeId as empCode, e.department
      FROM employee_agreements ea
      JOIN employees e ON ea.employeeId = e.id
      WHERE ea.agreementId = ?
      ORDER BY ea.uploadedAt DESC
    `).all(req.params.id);
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload new agreement template (admin only)
router.post('/', adminOnly, templateUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = db.prepare(
      'INSERT INTO nda_agreements (title, description, templatePath, templateName, templateSize, uploadedBy) VALUES (?,?,?,?,?,?)'
    ).run(title, description || '', req.file.filename, req.file.originalname, req.file.size, req.user.id);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Agreement uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update agreement template (admin only)
router.put('/:id', adminOnly, templateUpload.single('file'), (req, res) => {
  try {
    const agreement = db.prepare('SELECT * FROM nda_agreements WHERE id = ?').get(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    const { title, description } = req.body;

    if (req.file) {
      const oldPath = path.resolve(templatesDir, agreement.templatePath);
      if (oldPath.startsWith(path.resolve(templatesDir)) && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      db.prepare(
        `UPDATE nda_agreements SET title=?, description=?, templatePath=?, templateName=?, templateSize=?, updatedAt=datetime('now') WHERE id=?`
      ).run(title || agreement.title, description ?? agreement.description, req.file.filename, req.file.originalname, req.file.size, req.params.id);
    } else {
      db.prepare(
        `UPDATE nda_agreements SET title=?, description=?, updatedAt=datetime('now') WHERE id=?`
      ).run(title || agreement.title, description ?? agreement.description, req.params.id);
    }

    res.json({ message: 'Agreement updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Employee uploads signed agreement (PDF only)
router.post('/:id/submit', submissionUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const agreement = db.prepare('SELECT * FROM nda_agreements WHERE id = ?').get(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    // Upsert: delete old submission file if re-uploading
    const existing = db.prepare('SELECT * FROM employee_agreements WHERE agreementId = ? AND employeeId = ?').get(req.params.id, req.user.id);
    if (existing) {
      const oldPath = path.resolve(submissionsDir, existing.filePath);
      if (oldPath.startsWith(path.resolve(submissionsDir)) && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      db.prepare(
        `UPDATE employee_agreements SET filePath=?, fileName=?, fileSize=?, uploadedAt=datetime('now') WHERE id=?`
      ).run(req.file.filename, req.file.originalname, req.file.size, existing.id);
    } else {
      db.prepare(
        'INSERT INTO employee_agreements (agreementId, employeeId, filePath, fileName, fileSize) VALUES (?,?,?,?,?)'
      ).run(req.params.id, req.user.id, req.file.filename, req.file.originalname, req.file.size);
    }

    res.json({ message: 'Agreement submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete agreement (admin only)
router.delete('/:id', adminOnly, (req, res) => {
  try {
    const agreement = db.prepare('SELECT * FROM nda_agreements WHERE id = ?').get(req.params.id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    // Delete template file
    const templateFile = path.resolve(templatesDir, agreement.templatePath);
    if (templateFile.startsWith(path.resolve(templatesDir)) && fs.existsSync(templateFile)) fs.unlinkSync(templateFile);

    // Delete all submissions
    const submissions = db.prepare('SELECT * FROM employee_agreements WHERE agreementId = ?').all(req.params.id);
    submissions.forEach(s => {
      const subFile = path.resolve(submissionsDir, s.filePath);
      if (subFile.startsWith(path.resolve(submissionsDir)) && fs.existsSync(subFile)) fs.unlinkSync(subFile);
    });
    db.prepare('DELETE FROM employee_agreements WHERE agreementId = ?').run(req.params.id);
    db.prepare('DELETE FROM nda_agreements WHERE id = ?').run(req.params.id);

    res.json({ message: 'Agreement deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
