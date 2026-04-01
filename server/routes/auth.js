const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { SECRET, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM employees WHERE email = ? AND status = ?').get(email, 'active');
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, employeeId: user.employeeId, name: user.name, email: user.email, role: user.role, department: user.department, designation: user.designation },
    SECRET,
    { expiresIn: '24h' }
  );

  // Log activity
  db.prepare('INSERT INTO activity_log (userId, action, target, details) VALUES (?,?,?,?)').run(user.id, 'Login', 'Auth', `${user.name} logged in`);

  const { password: _, ...userData } = user;
  res.json({ token, user: userData });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT id, employeeId, name, email, phone, department, designation, joiningDate, managerId, role, avatar, status,
           dateOfBirth, bloodGroup, gender, address, emergencyContactName, emergencyContactPhone
    FROM employees WHERE id = ?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT password FROM employees WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE employees SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ message: 'Password updated' });
});

module.exports = router;
