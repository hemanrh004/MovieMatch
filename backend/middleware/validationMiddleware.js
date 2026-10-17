const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

// ---- Rule builders. Each rule: (value) => ({ error } | { value }) ----
const missing = (v) => v === undefined || v === null || v === '';

const rules = {
  string: (o = {}) => (v) => {
    if (v === '' && o.allowEmpty) return { value: '' };
    if (missing(v)) return o.required ? { error: 'is required' } : { value: o.default };
    if (typeof v !== 'string') return { error: 'must be a string' };
    const s = o.trim === false ? v : v.trim();
    if (o.required && !s) return { error: 'is required' };
    if (o.min && s.length < o.min) return { error: `must be at least ${o.min} characters` };
    if (o.max && s.length > o.max) return { error: `must be at most ${o.max} characters` };
    if (o.pattern && !o.pattern.test(s)) return { error: o.patternMessage || 'is invalid' };
    return { value: o.lowercase ? s.toLowerCase() : s };
  },
  email: (o = {}) => (v) => {
    if (missing(v)) return o.required ? { error: 'is required' } : { value: undefined };
    const s = String(v).trim().toLowerCase();
    if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return { error: 'must be a valid email address' };
    return { value: s };
  },
  password: () => (v) => {
    if (missing(v)) return { error: 'is required' };
    if (typeof v !== 'string') return { error: 'must be a string' };
    if (v.length < 8) return { error: 'must be at least 8 characters' };
    if (v.length > 128) return { error: 'must be at most 128 characters' };
    if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return { error: 'must contain at least one letter and one number' };
    return { value: v };
  },
  int: (o = {}) => (v) => {
    if (missing(v)) return o.required ? { error: 'is required' } : { value: o.default };
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isInteger(n)) return { error: 'must be an integer' };
    if (o.min !== undefined && n < o.min) return { error: `must be at least ${o.min}` };
    if (o.max !== undefined && n > o.max) return { error: `must be at most ${o.max}` };
    return { value: n };
  },
  enum: (values, o = {}) => (v) => {
    if (missing(v)) return o.required ? { error: 'is required' } : { value: o.default };
    return values.includes(v) ? { value: v } : { error: `must be one of: ${values.join(', ')}` };
  },
  objectId: (o = {}) => (v) => {
    if (missing(v)) return o.required ? { error: 'is required' } : { value: undefined };
    return typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v) && mongoose.isValidObjectId(v) ? { value: v } : { error: 'must be a valid id' };
  },
  array: (item, o = {}) => (v) => {
    if (v === undefined || v === null) return o.required ? { error: 'is required' } : { value: undefined };
    const arr = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : null;
    if (!arr) return { error: 'must be an array' };
    if (o.min && arr.length < o.min) return { error: `must contain at least ${o.min} item(s)` };
    if (o.max && arr.length > o.max) return { error: `must contain at most ${o.max} items` };
    const out = [];
    for (const el of arr) {
      const r = item(el);
      if (r.error) return { error: `contains an invalid item (${r.error})` };
      if (!out.includes(r.value)) out.push(r.value);
    }
    return { value: out };
  },
};

// schema = { body: {field: rule}, params: {...}, query: {...} }
const validate = (schema) => (req, res, next) => {
  const errors = [];
  for (const loc of ['params', 'query', 'body']) {
    const fields = schema[loc];
    if (!fields) continue;
    const src = req[loc] || {};
    const clean = { ...src };
    for (const [key, rule] of Object.entries(fields)) {
      const { error, value } = rule(src[key]);
      if (error) errors.push({ field: key, location: loc, message: `${key} ${error}` });
      else if (value === undefined) delete clean[key];
      else clean[key] = value;
    }
    if (loc === 'params') Object.assign(req.params, clean); else req[loc] = clean;
  }
  if (errors.length) {
    return next(new AppError(`Validation failed: ${errors.map((e) => e.message).join('; ')}`, 400, errors));
  }
  return next();
};

const merge = (...schemas) => ({
  body: Object.assign({}, ...schemas.map((s) => s.body)),
  params: Object.assign({}, ...schemas.map((s) => s.params)),
  query: Object.assign({}, ...schemas.map((s) => s.query)),
});

// ---- NoSQL-injection guard: drops keys starting with "$" or containing "." ----
const clean = (o) => {
  if (Array.isArray(o)) return o.map(clean);
  if (o && typeof o === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(o)) if (!k.startsWith('$') && !k.includes('.')) out[k] = clean(v);
    return out;
  }
  return o;
};
const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  next();
};

module.exports = { validate, merge, sanitizeInput, rules };
