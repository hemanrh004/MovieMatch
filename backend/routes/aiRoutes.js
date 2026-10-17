const router = require('express').Router();
const { recommend } = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/authMiddleware');
const { aiLimiter } = require('../middleware/rateLimitMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { aiBody } = require('../validators/socialValidator');

// Works logged-out too; a valid token personalizes results.
router.post('/recommend', aiLimiter, optionalAuth, validate(aiBody), recommend);

module.exports = router;
