const express = require('express');
const db = require('../db');
const { authMiddleware, managerOrAdmin, adminOnly } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();
router.use(authMiddleware);

// Get expense categories
router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM expense_categories ORDER BY name').all());
});

// Get my expenses
router.get('/my', (req, res) => {
  const expenses = db.prepare(`
    SELECT e.*, ec.name as categoryName,
           m.name as managerApprovedByName, f.name as financeApprovedByName
    FROM expenses e
    JOIN expense_categories ec ON e.categoryId = ec.id
    LEFT JOIN employees m ON e.managerApprovedBy = m.id
    LEFT JOIN employees f ON e.financeApprovedBy = f.id
    WHERE e.employeeId = ?
    ORDER BY e.submittedOn DESC
  `).all(req.user.id);
  res.json(expenses);
});

// Get all expenses (manager/admin)
router.get('/all', managerOrAdmin, (req, res) => {
  let query = `
    SELECT e.*, ec.name as categoryName, emp.name as employeeName, emp.department, emp.employeeId as empCode,
           m.name as managerApprovedByName, f.name as financeApprovedByName
    FROM expenses e
    JOIN expense_categories ec ON e.categoryId = ec.id
    JOIN employees emp ON e.employeeId = emp.id
    LEFT JOIN employees m ON e.managerApprovedBy = m.id
    LEFT JOIN employees f ON e.financeApprovedBy = f.id
  `;
  if (req.user.role === 'manager') {
    query += ` WHERE e.employeeId IN (SELECT id FROM employees WHERE managerId = ${req.user.id})`;
  }
  query += ' ORDER BY e.submittedOn DESC';
  res.json(db.prepare(query).all());
});

// Submit expense
router.post('/submit', (req, res) => {
  const { categoryId, amount, description, expenseDate } = req.body;
  if (!categoryId || !amount || !expenseDate) {
    return res.status(400).json({ error: 'Category, amount, and date are required' });
  }
  const result = db.prepare(`
    INSERT INTO expenses (employeeId, categoryId, amount, description, expenseDate) VALUES (?,?,?,?,?)
  `).run(req.user.id, categoryId, amount, description, expenseDate);

  // Notify manager
  const emp = db.prepare('SELECT managerId FROM employees WHERE id = ?').get(req.user.id);
  if (emp?.managerId) {
    createNotification(emp.managerId, 'New Expense Claim', `${req.user.name} submitted an expense of ₹${amount}`, 'expense', '/expenses');
  }

  res.status(201).json({ id: result.lastInsertRowid, message: 'Expense submitted' });
});

// Manager action on expense
router.put('/manager-action/:id', managerOrAdmin, (req, res) => {
  const { status, remarks } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Not found' });
  if (exp.status !== 'pending_manager') return res.status(400).json({ error: 'Not pending manager approval' });

  if (status === 'rejected') {
    db.prepare('UPDATE expenses SET status = ?, managerApprovedBy = ?, managerRemarks = ? WHERE id = ?')
      .run('rejected', req.user.id, remarks || null, req.params.id);
    createNotification(exp.employeeId, 'Expense Rejected', `Your expense of ₹${exp.amount} was rejected by manager`, 'expense', '/expenses');
  } else {
    db.prepare('UPDATE expenses SET status = ?, managerApprovedBy = ?, managerRemarks = ? WHERE id = ?')
      .run('pending_finance', req.user.id, remarks || null, req.params.id);
    // Notify finance manager (admin or finance dept manager)
    const finMgr = db.prepare("SELECT id FROM employees WHERE department = 'Finance' AND role IN ('admin','manager') LIMIT 1").get();
    if (finMgr) createNotification(finMgr.id, 'Expense Pending Finance Approval', `Expense of ₹${exp.amount} approved by manager`, 'expense', '/expenses');
  }
  res.json({ message: `Expense ${status}` });
});

// Finance action on expense
router.put('/finance-action/:id', (req, res) => {
  if (req.user.role !== 'admin' && req.user.department !== 'Finance') {
    return res.status(403).json({ error: 'Finance or admin access required' });
  }
  const { status, remarks } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Not found' });
  if (exp.status !== 'pending_finance') return res.status(400).json({ error: 'Not pending finance approval' });

  db.prepare('UPDATE expenses SET status = ?, financeApprovedBy = ?, financeRemarks = ? WHERE id = ?')
    .run(status, req.user.id, remarks || null, req.params.id);

  createNotification(exp.employeeId, status === 'approved' ? 'Expense Approved' : 'Expense Rejected',
    `Your expense of ₹${exp.amount} was ${status} by finance`, 'expense', '/expenses');

  res.json({ message: `Expense ${status}` });
});

// Expense summary stats
router.get('/stats', managerOrAdmin, (req, res) => {
  const total = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE status = 'approved'").get().total;
  const pending = db.prepare("SELECT COUNT(*) as count FROM expenses WHERE status IN ('pending_manager','pending_finance')").get().count;
  const thisMonth = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE status = 'approved' AND expenseDate >= date('now','start of month')`).get().total;
  res.json({ totalApproved: total, pendingCount: pending, thisMonth });
});

module.exports = router;
