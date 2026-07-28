const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler');
const User = require('../models/User');
const mongoose = require('mongoose');
const { getUserById } = require('../utilities/inMemoryStore');

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user;
    if (mongoose.connection.readyState !== 1) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ ok: false, message: 'Database connection unavailable' });
      }
      user = getUserById(decoded.sub);
      if (!user) {
        return res.status(401).json({ ok: false, message: 'Invalid authorization token' });
      }
    } else {
      user = await User.findById(decoded.sub).select('-password');
      if (!user) {
        return res.status(401).json({ ok: false, message: 'Invalid authorization token' });
      }
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, message: 'Invalid token' });
  }
});

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }
    next();
  };
};

module.exports = { authMiddleware, authorize };
