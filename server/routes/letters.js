const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get employee data for letter generation
router.get('/employee-data/:id', adminOnly, (req, res) => {
  try {
    const emp = db.prepare(`
      SELECT e.*, m.name as managerName, s.basicSalary, s.hra, s.transportAllowance,
             s.medicalAllowance, s.specialAllowance, s.providentFund, s.professionalTax, s.incomeTax
      FROM employees e
      LEFT JOIN employees m ON e.managerId = m.id
      LEFT JOIN salary_structures s ON e.id = s.employeeId
      WHERE e.id = ?
    `).get(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const gross = (emp.basicSalary || 0) + (emp.hra || 0) + (emp.transportAllowance || 0) + (emp.medicalAllowance || 0) + (emp.specialAllowance || 0);
    const deductions = (emp.providentFund || 0) + (emp.professionalTax || 0) + (emp.incomeTax || 0);
    const net = gross - deductions;
    const ctc = gross * 12;

    const company = {};
    db.prepare("SELECT key, value FROM company_settings").all().forEach(s => { company[s.key] = s.value; });

    res.json({ ...emp, grossSalary: gross, totalDeductions: deductions, netSalary: net, ctc, company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get employees list for letter generation
router.get('/employees', adminOnly, (req, res) => {
  try {
    const employees = db.prepare("SELECT id, employeeId, name, department, designation FROM employees WHERE status = 'active' ORDER BY name").all();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get letter templates
router.get('/templates', (req, res) => {
  try {
    const templates = [
      { id: 'offer', name: 'Offer Letter', description: 'Employment offer letter for new hires' },
      { id: 'experience', name: 'Experience Letter', description: 'Experience/service certificate' },
      { id: 'salary', name: 'Salary Certificate', description: 'Salary verification certificate' },
      { id: 'relieving', name: 'Relieving Letter', description: 'Relieving letter after resignation' },
      { id: 'appraisal', name: 'Appraisal Letter', description: 'Annual appraisal/increment letter' },
      { id: 'warning', name: 'Warning Letter', description: 'Disciplinary warning letter' },
    ];
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
