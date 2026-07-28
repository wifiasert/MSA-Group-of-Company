const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler');
const User = require('../models/User');
const mongoose = require('mongoose');
const { getUserById } = require('../utilities/inMemoryStore');

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('[auth] request', req.method, req.originalUrl, 'authHeader=', authHeader);
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[auth] missing or invalid auth header');
    return res.status(401).json({ ok: false, message: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];
  console.log('[auth] extracted token length=', token.length, 'jwtSecret set=', Boolean(process.env.JWT_SECRET));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[auth] token verified', decoded);
    let user;
    if (mongoose.connection.readyState !== 1) {
      user = getUserById(decoded.sub);
      if (!user) {
        console.log('[auth] no in-memory user found for id', decoded.sub);
        return res.status(401).json({ ok: false, message: 'Invalid authorization token' });
      }
    } else {
      user = await User.findById(decoded.sub).select('-password');
      if (!user) {
        console.log('[auth] no DB user found for id', decoded.sub);
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
