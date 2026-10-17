const jwt = require('jsonwebtoken');

// JWT payload contains only the user id.
module.exports = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
