const router = require('express').Router();
const c = require('../controllers/movieController');
const d = require('../controllers/discussionController');
const { protect } = require('../middleware/authMiddleware');
const { validate, merge } = require('../middleware/validationMiddleware');
const { rules: r } = require('../middleware/validationMiddleware');
const v = require('../validators/movieValidator');
const s = require('../validators/socialValidator');

// Fixed paths first, then the /:movieId routes.
router.get('/trending', validate(v.pageQuery), c.getTrending);
router.get('/popular', validate(v.pageQuery), c.getPopular);
router.get('/top-rated', validate(v.pageQuery), c.getTopRated);
router.get('/now-playing', validate(v.pageQuery), c.getNowPlaying);
router.get('/upcoming', validate(v.pageQuery), c.getUpcoming);
router.get('/search', validate(v.searchRules), c.searchMovies);
router.get('/genres', c.getGenres);
router.get('/languages', c.getLanguages);
router.get('/genre/:genreId', validate(merge(v.genreIdParam, v.pageQuery)), c.getByGenre);
router.get('/language/:language', validate(merge({ params: { language: r.string({ required: true, min: 2, max: 3, lowercase: true }) } }, v.pageQuery)), c.getByLanguage);

// Discussion rooms (authenticated)
router.get('/:movieId/discussion', protect, validate(merge(v.movieIdParam, s.paginationQuery)), d.getDiscussion);
router.post('/:movieId/discussion', protect, validate(merge(v.movieIdParam, s.discussionBody)), d.postMessage);
router.post('/:movieId/discussion/:messageId/like', protect, validate(merge(v.movieIdParam, s.discussionLikeParams)), d.toggleLike);

router.get('/:movieId/similar', validate(merge(v.movieIdParam, v.pageQuery)), c.getSimilar);
router.get('/:movieId/recommendations', validate(merge(v.movieIdParam, v.pageQuery)), c.getRecommended);
router.get('/:movieId/credits', validate(v.movieIdParam), c.getCredits);
router.get('/:movieId/videos', validate(v.movieIdParam), c.getVideos);
router.get('/:movieId', validate(v.movieIdParam), c.getMovie);

module.exports = router;
