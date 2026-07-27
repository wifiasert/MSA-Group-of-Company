const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { createAuthTokens } = require('../utilities/tokenUtil');
const { successResponse, errorResponse } = require('../utilities/responseUtil');
const mongoose = require('mongoose');
const { createUser: createInMemoryUser, getUserByEmail, getUserById } = require('../utilities/inMemoryStore');

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 422, errors.array());
  }

  const { name, email, password, role } = req.body;
  // If Mongoose isn't connected, use in-memory store
  if (mongoose.connection.readyState !== 1) {
    if (getUserByEmail(email)) {
      return errorResponse(res, 'Email address already in use', 409);
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = createInMemoryUser({ name, email, password: hashedPassword, role });
    const tokens = createAuthTokens(user);
    return successResponse(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, tokens }, 'User registered', 201);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return errorResponse(res, 'Email address already in use', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashedPassword, role, verified: false });
  const tokens = createAuthTokens(user);

  return successResponse(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, tokens }, 'User registered', 201);
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 'Validation failed', 422, errors.array());
  }

  const { email, password } = req.body;
  // If Mongoose isn't connected, use in-memory store
  if (mongoose.connection.readyState !== 1) {
    const user = getUserByEmail(email);
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return errorResponse(res, 'Invalid email or password', 401);
    }
    const tokens = createAuthTokens(user);
    return successResponse(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, tokens }, 'Login successful');
  }

  const user = await User.findOne({ email });
  if (!user) {
    return errorResponse(res, 'Invalid email or password', 401);
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return errorResponse(res, 'Invalid email or password', 401);
  }

  const tokens = createAuthTokens(user);
  return successResponse(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role }, tokens }, 'Login successful');
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return errorResponse(res, 'Refresh token is required', 400);
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    let user;
    if (mongoose.connection.readyState !== 1) {
      user = getUserById(payload.sub);
      if (!user) return errorResponse(res, 'Invalid refresh token', 401);
      const tokens = createAuthTokens(user);
      return successResponse(res, { tokens }, 'Token refreshed');
    }
    user = await User.findById(payload.sub);
    if (!user) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }
    const tokens = createAuthTokens(user);
    return successResponse(res, { tokens }, 'Token refreshed');
  } catch (error) {
    return errorResponse(res, 'Invalid refresh token', 401);
  }
};

const logout = async (req, res) => {
  return successResponse(res, null, 'Logout complete');
};

module.exports = { register, login, refreshToken, logout };
