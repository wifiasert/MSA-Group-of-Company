const jwt = require('jsonwebtoken');

const signToken = (payload, expiresIn) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required to sign tokens');
  }
  return jwt.sign(payload, jwtSecret, { expiresIn });
};

const createAuthTokens = (user) => {
  const accessToken = signToken({ sub: user._id.toString(), role: user.role }, process.env.JWT_EXPIRES_IN || '1d');
  const refreshToken = signToken({ sub: user._id.toString(), role: user.role }, process.env.REFRESH_TOKEN_EXPIRES_IN || '7d');
  return { accessToken, refreshToken };
};

module.exports = { signToken, createAuthTokens };
