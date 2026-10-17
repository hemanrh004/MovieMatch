const router = require('express').Router();
const c = require('../controllers/watchlistController');
const { protect } = require('../middleware/authMiddleware');
const { validate, merge } = require('../middleware/validationMiddleware');
const v = require('../validators/movieValidator');

router.use(protect);
router.post('/', validate(v.watchlistBody), c.addToWatchlist);
router.get('/', validate(v.listQuery), c.getWatchlist);
router.get('/check/:movieId', validate(v.movieIdParam), c.checkWatchlist);
router.delete('/:movieId', validate(v.movieIdParam), c.removeFromWatchlist);

module.exports = router;
