const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');

const make = (windowMs, max, message) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, handler: (req, res) => sendError(res, message, 429) });

const isProd = process.env.NODE_ENV === 'production';
const apiLimiter = make(15 * 60 * 1000, Number(process.env.RATE_LIMIT_MAX) || 600, 'Too many requests, please try again later');
const authLimiter = make(15 * 60 * 1000, isProd ? 20 : 100, 'Too many login attempts, please try again later');
const aiLimiter = make(60 * 1000, 10, 'Too many AI requests, please wait a minute');

module.exports = { apiLimiter, authLimiter, aiLimiter };
