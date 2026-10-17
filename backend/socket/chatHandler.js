const Conversation = require('../models/Conversation');
const { createMessage, markMessageRead, markConversationRead } = require('../controllers/messageController');

// Wraps a handler so errors go back through the ack callback instead of crashing the socket.
const safe = (handler) => async (payload, ack) => {
  const reply = typeof ack === 'function' ? ack : () => {};
  try {
    reply({ success: true, ...(await handler(payload || {})) });
  } catch (err) {
    reply({ success: false, message: err.isOperational ? err.message : 'Something went wrong' });
    if (!err.isOperational) console.error('Socket handler error:', err);
  }
};

module.exports = (io, socket) => {
  const userId = String(socket.user._id);
  const room = (id) => `conversation:${id}`;

  socket.on('joinConversation', safe(async ({ conversationId }) => {
    const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conv) throw Object.assign(new Error('Conversation not found'), { isOperational: true });
    socket.join(room(conversationId));
    return { conversationId };
  }));

  socket.on('leaveConversation', safe(async ({ conversationId }) => {
    socket.leave(room(conversationId));
    return { conversationId };
  }));

  // payload: { receiverId, text, tempId? } -> ack: { success, message, tempId }
  socket.on('sendMessage', safe(async ({ receiverId, text, tempId }) => {
    const clean = typeof text === 'string' ? text.trim() : '';
    if (!clean || clean.length > 2000) throw Object.assign(new Error('Message must be 1-2000 characters'), { isOperational: true });
    const { message, conversation } = await createMessage({ senderId: userId, receiverId, text: clean, io });
    socket.to(`user:${userId}`).emit('receiveMessage', message); // sync the sender's other tabs/devices
    return { message, conversationId: conversation._id, tempId };
  }));

  const typing = (event) => ({ conversationId }) => {
    if (socket.rooms.has(room(conversationId))) socket.to(room(conversationId)).emit(event, { conversationId, userId });
  };
  socket.on('typing', typing('typing'));
  socket.on('stopTyping', typing('stopTyping'));

  // payload: { messageId } or { conversationId } (marks everything in the conversation as read)
  socket.on('messageRead', safe(async ({ messageId, conversationId }) => {
    if (conversationId) return { updated: await markConversationRead({ conversationId, userId, io }) };
    if (messageId) { await markMessageRead({ messageId, userId, io }); return { messageId }; }
    throw Object.assign(new Error('messageId or conversationId is required'), { isOperational: true });
  }));
};
