const router = require('express').Router();
const c = require('../controllers/swipeController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const v = require('../validators/movieValidator');

router.use(protect);
router.post('/', validate(v.swipeBody), c.recordSwipe);
router.post('/undo', c.undoSwipe);
router.get('/history', validate(v.listQuery), c.getHistory);
router.get('/liked', validate(v.listQuery), c.getLiked);
router.get('/disliked', validate(v.listQuery), c.getDisliked);

module.exports = router;
