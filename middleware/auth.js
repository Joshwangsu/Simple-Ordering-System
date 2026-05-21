const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../services/authService');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ error: 'A token is required for authentication' });
  }

  try {
    // Expected format: "Bearer <token>"
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = decoded; // { id, role, is_first_login, iat, exp }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Token' });
  }
  return next();
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
