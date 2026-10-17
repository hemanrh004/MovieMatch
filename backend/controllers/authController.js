const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const generateToken = require('../utils/generateToken');
const { sendSuccess } = require('../utils/apiResponse');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new AppError('An account with this email already exists', 409);
  const user = await User.create({ name, email, password }); // password hashed in the model's pre-save hook
  return sendSuccess(res, { token: generateToken(user._id), user }, 'Registration successful', 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password: don't reveal which accounts exist.
  if (!user || !(await user.comparePassword(password))) throw new AppError('Invalid email or password', 401);
  return sendSuccess(res, { token: generateToken(user._id), user }, 'Login successful');
});

const getMe = asyncHandler(async (req, res) => sendSuccess(res, { user: req.user }, 'Current user fetched'));

// JWTs are stateless: the client deletes its token. (Add a token blocklist later if you need server-side revocation.)
const logout = asyncHandler(async (req, res) => sendSuccess(res, {}, 'Logged out successfully'));

module.exports = { register, login, getMe, logout };
