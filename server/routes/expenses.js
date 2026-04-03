const express = require('express');
const db = require('../db');
const { authMiddleware, managerOrAdmin, adminOnly } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();
router.use(authMiddleware);

// Get expense categories
router.get('/categories', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM expense_categories ORDER BY name').all());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my expenses
router.get('/my', (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all expenses (manager/admin, supports pagination via ?page=1&limit=20)
router.get('/all', managerOrAdmin, (req, res) => {
  try {
    const { page, limit: limitParam, status: statusFilter } = req.query;

    let whereClause = '';
    const params = [];
    if (req.user.role === 'manager') {
      whereClause += ` WHERE e.employeeId IN (SELECT id FROM employees WHERE managerId = ?)`;
      params.push(req.user.id);
    }
    if (statusFilter) {
      whereClause += whereClause ? ` AND e.status = ?` : ` WHERE e.status = ?`;
      params.push(statusFilter);
    }

    const baseQuery = `
      FROM expenses e
      JOIN expense_categories ec ON e.categoryId = ec.id
      JOIN employees emp ON e.employeeId = emp.id
      LEFT JOIN employees m ON e.managerApprovedBy = m.id
      LEFT JOIN employees f ON e.financeApprovedBy = f.id
      ${whereClause}
    `;

    const selectFields = `e.*, ec.name as categoryName, emp.name as employeeName, emp.department, emp.employeeId as empCode,
             m.name as managerApprovedByName, f.name as financeApprovedByName`;

    if (page) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitParam) || 20));
      const offset = (pageNum - 1) * limit;

      const { total } = db.prepare(`SELECT COUNT(*) as total ${baseQuery}`).get(...params);
      const expenses = db.prepare(`SELECT ${selectFields} ${baseQuery} ORDER BY e.submittedOn DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
      res.json({ data: expenses, pagination: { page: pageNum, limit, total, totalPages: Math.ceil(total / limit) } });
    } else {
      res.json(db.prepare(`SELECT ${selectFields} ${baseQuery} ORDER BY e.submittedOn DESC`).all(...params));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit expense
router.post('/submit', (req, res) => {
  try {
    const { categoryId, amount, description, expenseDate } = req.body;
    if (!categoryId || !amount || !expenseDate) {
      return res.status(400).json({ error: 'Category, amount, and date are required' });
    }
    if (isNaN(amount) || Number(amount) <= 0 || Number(amount) > 10000000) {
      return res.status(400).json({ error: 'Amount must be between 1 and 1,00,00,000' });
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manager action on expense
router.put('/manager-action/:id', managerOrAdmin, (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Finance action on expense
router.put('/finance-action/:id', (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const isFinanceDept = req.user.department === 'Finance' && (req.user.role === 'manager' || req.user.role === 'admin');
    if (!isAdmin && !isFinanceDept) {
      return res.status(403).json({ error: 'Finance manager or admin access required' });
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete pending expense (employee can delete own pending expense)
router.delete('/:id', (req, res) => {
  try {
    const exp = db.prepare('SELECT * FROM expenses WHERE id = ? AND employeeId = ?').get(req.params.id, req.user.id);
    if (!exp) return res.status(404).json({ error: 'Expense not found' });
    if (exp.status !== 'pending_manager') {
      return res.status(400).json({ error: 'Only pending expenses can be deleted' });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expense summary stats
router.get('/stats', managerOrAdmin, (req, res) => {
  try {
    const total = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE status = 'approved'").get().total;
    const pending = db.prepare("SELECT COUNT(*) as count FROM expenses WHERE status IN ('pending_manager','pending_finance')").get().count;
    const thisMonth = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE status = 'approved' AND expenseDate >= date('now','start of month')`).get().total;
    res.json({ totalApproved: total, pendingCount: pending, thisMonth });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
