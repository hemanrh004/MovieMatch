const { rules: r } = require('../middleware/validationMiddleware');

exports.userIdParam = { params: { userId: r.objectId({ required: true }) } };
exports.conversationIdParam = { params: { conversationId: r.objectId({ required: true }) } };
exports.messageIdParam = { params: { messageId: r.objectId({ required: true }) } };
exports.notificationIdParam = { params: { id: r.objectId({ required: true }) } };
exports.paginationQuery = { query: { page: r.int({ min: 1, default: 1 }), limit: r.int({ min: 1, max: 100 }) } };
exports.messageBody = { body: { receiverId: r.objectId({ required: true }), text: r.string({ required: true, min: 1, max: 2000 }) } };
exports.discussionBody = {
  body: { text: r.string({ required: true, min: 1, max: 1000 }), parent: r.objectId() },
};
exports.discussionLikeParams = { params: { messageId: r.objectId({ required: true }) } };
exports.aiBody = { body: { message: r.string({ required: true, min: 2, max: 500 }) } };
