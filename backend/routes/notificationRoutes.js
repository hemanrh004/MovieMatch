const router = require('express').Router();
const c = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { validate, merge } = require('../middleware/validationMiddleware');
const s = require('../validators/socialValidator');

router.use(protect);
router.get('/', validate(s.paginationQuery), c.getNotifications);
router.put('/read-all', c.markAllRead);
router.put('/:id/read', validate(s.notificationIdParam), c.markRead);
router.delete('/:id', validate(s.notificationIdParam), c.deleteNotification);

module.exports = router;
