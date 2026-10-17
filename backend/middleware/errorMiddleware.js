const AppError = require('../utils/AppError');
const { sendError } = require('../utils/apiResponse');

const notFound = (req, res, next) => next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.name === 'CastError') { status = 400; message = `Invalid value for ${err.path}`; }
  else if (err.name === 'ValidationError' && err.errors) {
    status = 400; message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    status = 409; const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value: ${field} already exists`;
  } else if (err.name === 'JsonWebTokenError') { status = 401; message = 'Invalid token'; }
  else if (err.name === 'TokenExpiredError') { status = 401; message = 'Token expired, please log in again'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON in request body'; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Request body too large'; }

  const isProd = process.env.NODE_ENV === 'production';
  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    if (isProd) message = 'Internal server error';
  }
  const error = { ...(details ? { details } : {}), ...(!isProd && status >= 500 ? { stack: err.stack } : {}) };
  return sendError(res, message, status, error);
};

module.exports = { notFound, errorHandler };
