const router = require('express').Router();
const { register, login, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { registerRules, loginRules } = require('../validators/authValidator');

router.post('/register', authLimiter, validate(registerRules), register);
router.post('/login', authLimiter, validate(loginRules), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
