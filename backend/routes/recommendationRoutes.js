const router = require('express').Router();
const { getMyRecommendations } = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const v = require('../validators/movieValidator');

router.get('/', protect, validate(v.listQuery), getMyRecommendations);

module.exports = router;
