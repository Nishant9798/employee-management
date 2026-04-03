const express = require('express');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { createNotification } = require('./notifications');

// Payslip uploads directory
const payslipDir = path.join(__dirname, '..', '..', 'uploads', 'payslips');
if (!fs.existsSync(payslipDir)) fs.mkdirSync(payslipDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, payslipDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();
router.use(authMiddleware);

// Get my salary structure
router.get('/my-structure', (req, res) => {
  try {
    const structure = db.prepare('SELECT * FROM salary_structures WHERE employeeId = ?').get(req.user.id);
    res.json(structure || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get salary structure for employee (admin)
router.get('/structure/:employeeId', adminOnly, (req, res) => {
  try {
    const structure = db.prepare('SELECT * FROM salary_structures WHERE employeeId = ?').get(req.params.employeeId);
    res.json(structure || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update salary structure (admin)
router.put('/structure/:employeeId', adminOnly, (req, res) => {
  try {
    const { basicSalary, hra, transportAllowance, medicalAllowance, specialAllowance, providentFund, professionalTax, incomeTax, effectiveFrom } = req.body;
    const existing = db.prepare('SELECT id FROM salary_structures WHERE employeeId = ?').get(req.params.employeeId);
    if (existing) {
      db.prepare(`UPDATE salary_structures SET basicSalary=?, hra=?, transportAllowance=?, medicalAllowance=?, specialAllowance=?, providentFund=?, professionalTax=?, incomeTax=?, effectiveFrom=? WHERE employeeId=?`)
        .run(basicSalary, hra, transportAllowance, medicalAllowance, specialAllowance, providentFund, professionalTax, incomeTax, effectiveFrom, req.params.employeeId);
    } else {
      db.prepare(`INSERT INTO salary_structures (employeeId, basicSalary, hra, transportAllowance, medicalAllowance, specialAllowance, providentFund, professionalTax, incomeTax, effectiveFrom) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(req.params.employeeId, basicSalary, hra, transportAllowance, medicalAllowance, specialAllowance, providentFund, professionalTax, incomeTax, effectiveFrom);
    }
    res.json({ message: 'Salary structure updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my payslips
router.get('/my-payslips', (req, res) => {
  try {
    const payslips = db.prepare('SELECT * FROM payslips WHERE employeeId = ? ORDER BY year DESC, month DESC').all(req.user.id);
    res.json(payslips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get payslips for employee (admin)
router.get('/payslips/:employeeId', adminOnly, (req, res) => {
  try {
    const payslips = db.prepare('SELECT * FROM payslips WHERE employeeId = ? ORDER BY year DESC, month DESC').all(req.params.employeeId);
    res.json(payslips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate payslips for a month (admin)
router.post('/generate-payslips', adminOnly, (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'Month and year required' });

    const structures = db.prepare(`
      SELECT s.*, e.name FROM salary_structures s JOIN employees e ON s.employeeId = e.id WHERE e.status = 'active'
    `).all();

    let count = 0;
    structures.forEach(s => {
      const existing = db.prepare('SELECT id FROM payslips WHERE employeeId = ? AND month = ? AND year = ?').get(s.employeeId, month, year);
      if (existing) return;

      const gross = s.basicSalary + s.hra + s.transportAllowance + s.medicalAllowance + s.specialAllowance;
      const deductions = s.providentFund + s.professionalTax + s.incomeTax;
      const net = gross - deductions;

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      const attendance = db.prepare(`
        SELECT COUNT(CASE WHEN status IN ('present','late') THEN 1 END) as present,
               COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
        FROM attendance WHERE employeeId = ? AND date BETWEEN ? AND ?
      `).get(s.employeeId, startDate, endDate);

      db.prepare(`INSERT INTO payslips (employeeId, month, year, basicSalary, hra, transportAllowance, medicalAllowance, specialAllowance, grossSalary, providentFund, professionalTax, incomeTax, totalDeductions, netSalary, workingDays, presentDays, leaveDays, status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        s.employeeId, month, year, s.basicSalary, s.hra, s.transportAllowance, s.medicalAllowance, s.specialAllowance, gross, s.providentFund, s.professionalTax, s.incomeTax, deductions, net, 22, attendance?.present || 0, attendance?.absent || 0, 'generated'
      );
      count++;
    });

    res.json({ message: `Generated ${count} payslips` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All payslips (admin) - for reports
router.get('/all-payslips', adminOnly, (req, res) => {
  try {
    const { month, year } = req.query;
    let query = `SELECT p.*, e.name as employeeName, e.department, e.employeeId as empCode
      FROM payslips p JOIN employees e ON p.employeeId = e.id WHERE e.status = 'active'`;
    const params = [];
    if (month && year) {
      query += ` AND p.month = ? AND p.year = ?`;
      params.push(month, year);
    }
    query += ` ORDER BY p.year DESC, p.month DESC, e.name`;
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All salary structures (admin)
router.get('/all-structures', adminOnly, (req, res) => {
  try {
    const structures = db.prepare(`
      SELECT s.*, e.name, e.employeeId as empCode, e.department, e.designation
      FROM salary_structures s JOIN employees e ON s.employeeId = e.id WHERE e.status = 'active' ORDER BY e.name
    `).all();
    res.json(structures);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload payslip PDF for an employee (admin)
router.post('/upload-payslip', adminOnly, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { employeeId, month, year } = req.body;
    if (!employeeId || !month || !year) return res.status(400).json({ error: 'Employee, month and year required' });

    // Check if payslip record exists, update or create
    const existing = db.prepare('SELECT id FROM payslips WHERE employeeId = ? AND month = ? AND year = ?').get(employeeId, month, year);
    if (existing) {
      db.prepare('UPDATE payslips SET pdfPath = ? WHERE id = ?').run(req.file.filename, existing.id);
    } else {
      db.prepare('INSERT INTO payslips (employeeId, month, year, pdfPath, status) VALUES (?,?,?,?,?)').run(employeeId, month, year, req.file.filename, 'generated');
    }

    // Notify employee
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    createNotification(Number(employeeId), 'Payslip Uploaded', `Your payslip for ${monthNames[month - 1]} ${year} has been uploaded`, 'info', '/payslips');

    res.json({ message: 'Payslip uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk upload payslips for all employees (admin) - one file per employee
router.post('/bulk-upload-payslips', adminOnly, upload.array('files', 50), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'Month and year required' });

    // Match files to employees by filename pattern: EMP001_payslip.pdf or employeeId in filename
    const employees = db.prepare("SELECT id, employeeId FROM employees WHERE status = 'active'").all();
    let matched = 0;

    req.files.forEach(file => {
      const emp = employees.find(e => file.originalname.toUpperCase().includes(e.employeeId.toUpperCase()));
      if (!emp) return;

      const existing = db.prepare('SELECT id FROM payslips WHERE employeeId = ? AND month = ? AND year = ?').get(emp.id, month, year);
      if (existing) {
        db.prepare('UPDATE payslips SET pdfPath = ? WHERE id = ?').run(file.filename, existing.id);
      } else {
        db.prepare('INSERT INTO payslips (employeeId, month, year, pdfPath, status) VALUES (?,?,?,?,?)').run(emp.id, month, year, file.filename, 'generated');
      }
      createNotification(emp.id, 'Payslip Uploaded', `Your payslip for the selected month has been uploaded`, 'info', '/payslips');
      matched++;
    });

    res.json({ message: `Uploaded ${matched} payslips out of ${req.files.length} files` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download payslip PDF
router.get('/download-payslip/:id', (req, res) => {
  try {
    const payslip = db.prepare('SELECT * FROM payslips WHERE id = ?').get(req.params.id);
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

    // Only own payslip or admin
    if (payslip.employeeId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!payslip.pdfPath) return res.status(404).json({ error: 'No PDF uploaded for this payslip' });

    const filePath = path.resolve(payslipDir, payslip.pdfPath);
    // Prevent path traversal
    if (!filePath.startsWith(path.resolve(payslipDir))) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on server' });

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    res.download(filePath, `Payslip_${monthNames[payslip.month - 1]}_${payslip.year}.pdf`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all employees list for upload dropdown (admin)
router.get('/employees-list', adminOnly, (req, res) => {
  try {
    const employees = db.prepare("SELECT id, employeeId, name, department FROM employees WHERE status = 'active' ORDER BY name").all();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
