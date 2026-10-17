const router = require('express').Router();
const c = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { userIdParam } = require('../validators/socialValidator');

router.use(protect);
router.get('/', c.getFriends);
router.get('/requests', c.getRequests);
router.get('/suggestions', c.getSuggestions);
router.post('/request/:userId', validate(userIdParam), c.sendRequest);
router.post('/accept/:userId', validate(userIdParam), c.acceptRequest);
router.post('/reject/:userId', validate(userIdParam), c.rejectRequest);
router.delete('/:userId', validate(userIdParam), c.removeFriend);

module.exports = router;
