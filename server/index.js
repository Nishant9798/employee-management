const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/holidays', require('./routes/holidays'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/salary', require('./routes/salary'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/training', require('./routes/training'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/exit', require('./routes/exit'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/agreements', require('./routes/agreements'));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Default admin login: admin@company.com / admin123');
  console.log('Default employee login: rahul@company.com / emp123');
});
