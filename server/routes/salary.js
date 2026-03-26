const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get my salary structure
router.get('/my-structure', (req, res) => {
  const structure = db.prepare('SELECT * FROM salary_structures WHERE employeeId = ?').get(req.user.id);
  res.json(structure || {});
});

// Get salary structure for employee (admin)
router.get('/structure/:employeeId', adminOnly, (req, res) => {
  const structure = db.prepare('SELECT * FROM salary_structures WHERE employeeId = ?').get(req.params.employeeId);
  res.json(structure || {});
});

// Update salary structure (admin)
router.put('/structure/:employeeId', adminOnly, (req, res) => {
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
});

// Get my payslips
router.get('/my-payslips', (req, res) => {
  const payslips = db.prepare('SELECT * FROM payslips WHERE employeeId = ? ORDER BY year DESC, month DESC').all(req.user.id);
  res.json(payslips);
});

// Get payslips for employee (admin)
router.get('/payslips/:employeeId', adminOnly, (req, res) => {
  const payslips = db.prepare('SELECT * FROM payslips WHERE employeeId = ? ORDER BY year DESC, month DESC').all(req.params.employeeId);
  res.json(payslips);
});

// Generate payslips for a month (admin)
router.post('/generate-payslips', adminOnly, (req, res) => {
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
});

// All salary structures (admin)
router.get('/all-structures', adminOnly, (req, res) => {
  const structures = db.prepare(`
    SELECT s.*, e.name, e.employeeId as empCode, e.department, e.designation
    FROM salary_structures s JOIN employees e ON s.employeeId = e.id WHERE e.status = 'active' ORDER BY e.name
  `).all();
  res.json(structures);
});

module.exports = router;
