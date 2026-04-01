const express = require('express');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get my loans
router.get('/my', (req, res) => {
  const loans = db.prepare(`
    SELECT l.*, a.name as approvedByName FROM loans l
    LEFT JOIN employees a ON l.approvedBy = a.id
    WHERE l.employeeId = ? ORDER BY l.appliedOn DESC
  `).all(req.user.id);
  res.json(loans);
});

// Get all loans (admin)
router.get('/all', adminOnly, (req, res) => {
  const loans = db.prepare(`
    SELECT l.*, e.name as employeeName, e.employeeId as empCode, e.department,
           a.name as approvedByName
    FROM loans l
    JOIN employees e ON l.employeeId = e.id
    LEFT JOIN employees a ON l.approvedBy = a.id
    ORDER BY l.appliedOn DESC
  `).all();
  res.json(loans);
});

// Apply for loan
router.post('/apply', (req, res) => {
  const { type, amount, reason, emiMonths } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

  const months = emiMonths || 1;
  const emiAmount = Math.ceil(amount / months);

  const result = db.prepare(
    'INSERT INTO loans (employeeId, type, amount, reason, emiMonths, emiAmount) VALUES (?,?,?,?,?,?)'
  ).run(req.user.id, type || 'salary_advance', amount, reason, months, emiAmount);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Loan application submitted' });
});

// Approve/Reject loan (admin)
router.put('/:id/action', adminOnly, (req, res) => {
  const { status, remarks } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  const newStatus = status === 'approved' ? 'active' : 'rejected';
  db.prepare(`UPDATE loans SET status=?, approvedBy=?, approvedDate=datetime('now'), remarks=? WHERE id=?`)
    .run(newStatus, req.user.id, remarks, req.params.id);

  res.json({ message: `Loan ${status}` });
});

// Record repayment (admin)
router.post('/:id/repay', adminOnly, (req, res) => {
  const { amount, month, year } = req.body;
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  db.prepare('INSERT INTO loan_repayments (loanId, amount, month, year) VALUES (?,?,?,?)')
    .run(req.params.id, amount, month, year);

  const newTotal = loan.totalRepaid + amount;
  const completed = newTotal >= loan.amount;
  db.prepare('UPDATE loans SET totalRepaid=?, status=? WHERE id=?')
    .run(newTotal, completed ? 'completed' : 'active', req.params.id);

  res.json({ message: 'Repayment recorded', completed });
});

// Get repayments for a loan
router.get('/:id/repayments', (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  if (loan.employeeId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  const repayments = db.prepare('SELECT * FROM loan_repayments WHERE loanId = ? ORDER BY paidOn DESC').all(req.params.id);
  res.json(repayments);
});

// Stats (admin)
router.get('/stats/summary', adminOnly, (req, res) => {
  const pending = db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'pending'").get().c;
  const active = db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'active'").get().c;
  const totalDisbursed = db.prepare("SELECT COALESCE(SUM(amount), 0) as v FROM loans WHERE status IN ('active','completed')").get().v;
  const totalOutstanding = db.prepare("SELECT COALESCE(SUM(amount - totalRepaid), 0) as v FROM loans WHERE status = 'active'").get().v;
  res.json({ pending, active, totalDisbursed, totalOutstanding });
});

module.exports = router;
