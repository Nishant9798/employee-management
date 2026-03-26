const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', require('../../server/routes/auth'));
app.use('/api/employees', require('../../server/routes/employees'));
app.use('/api/leaves', require('../../server/routes/leaves'));
app.use('/api/attendance', require('../../server/routes/attendance'));
app.use('/api/holidays', require('../../server/routes/holidays'));
app.use('/api/announcements', require('../../server/routes/announcements'));

module.exports.handler = serverless(app);
