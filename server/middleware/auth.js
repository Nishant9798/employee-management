const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Use environment variable in production; generate a random secret for development
const SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SECURITY] JWT_SECRET environment variable is required in production!');
    process.exit(1);
  }
  console.warn('[WARNING] No JWT_SECRET set. Using auto-generated secret (tokens will not persist across restarts).');
  return crypto.randomBytes(64).toString('hex');
})();

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function managerOrAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager or admin access required' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly, managerOrAdmin, SECRET };
