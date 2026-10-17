const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const extractToken = (req) => {
  const header = req.headers.authorization;
  return header && header.startsWith('Bearer ') ? header.slice(7).trim() : null;
};

// Rejects missing/invalid/expired tokens. JWT errors are mapped to 401 in errorMiddleware.
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw new AppError('Not authorized: token missing', 401);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('Not authorized: user no longer exists', 401);
  req.user = user;
  next();
});

// Attaches req.user when a valid token is present; never rejects.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (e) { /* ignore invalid token for optional auth */ }
  }
  next();
});

module.exports = { protect, optionalAuth };
