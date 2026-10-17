const router = require('express').Router();
const c = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { validate, merge } = require('../middleware/validationMiddleware');
const s = require('../validators/socialValidator');

router.use(protect);
router.get('/conversations', c.getConversations);
router.post('/', validate(s.messageBody), c.sendMessage);
router.put('/:messageId/read', validate(s.messageIdParam), c.markRead);
router.delete('/:messageId', validate(s.messageIdParam), c.deleteMessage);
router.get('/:conversationId', validate(merge(s.conversationIdParam, s.paginationQuery)), c.getMessages);

module.exports = router;
