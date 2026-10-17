const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Friend = require('../models/Friend');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { createNotification } = require('./notificationController');
const presence = require('../socket/presence');

const preview = (text) => (text.length > 120 ? `${text.slice(0, 117)}...` : text);

/** Shared by the REST endpoint and the Socket.IO `sendMessage` event. Persists, then pushes live. */
const createMessage = async ({ senderId, receiverId, text, io }) => {
  if (String(senderId) === String(receiverId)) throw new AppError("You can't message yourself", 400);
  const [receiver, sender] = await Promise.all([User.findById(receiverId).select('_id'), User.findById(senderId).select('name')]);
  if (!receiver) throw new AppError('Recipient not found', 404);
  const areFriends = await Friend.exists({
    status: 'accepted',
    $or: [{ requester: senderId, recipient: receiverId }, { requester: receiverId, recipient: senderId }],
  });
  if (!areFriends) throw new AppError('You can only message your friends', 403);

  const key = Conversation.makeKey(senderId, receiverId);
  const conversation = await Conversation.findOneAndUpdate(
    { key },
    { $setOnInsert: { participants: [senderId, receiverId] } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const message = await Message.create({ conversationId: conversation._id, sender: senderId, receiver: receiverId, text });
  conversation.lastMessage = preview(text);
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  if (io) {
    io.to(`user:${receiverId}`).emit('receiveMessage', message);
    if (presence.isOnline(receiverId)) io.to(`user:${senderId}`).emit('messageDelivered', { messageId: message._id, conversationId: conversation._id });
  }
  await createNotification({
    io, recipient: receiverId, sender: senderId, type: 'new_message',
    message: `${sender?.name || 'Someone'}: ${preview(text)}`, relatedId: conversation._id, dedupe: true,
  });
  return { message, conversation };
};

const markMessageRead = async ({ messageId, userId, io }) => {
  const message = await Message.findOneAndUpdate({ _id: messageId, receiver: userId, read: false }, { read: true, readAt: new Date() }, { new: true });
  if (!message) {
    const exists = await Message.findById(messageId);
    if (!exists) throw new AppError('Message not found', 404);
    if (String(exists.receiver) !== String(userId)) throw new AppError('Only the recipient can mark a message as read', 403);
    return exists; // already read
  }
  if (io) io.to(`user:${message.sender}`).emit('messageRead', { messageId: message._id, conversationId: message.conversationId, readAt: message.readAt });
  return message;
};

const markConversationRead = async ({ conversationId, userId, io }) => {
  const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
  if (!conv) throw new AppError('Conversation not found', 404);
  const result = await Message.updateMany({ conversationId, receiver: userId, read: false }, { read: true, readAt: new Date() });
  if (result.modifiedCount && io) {
    const other = conv.participants.find((p) => String(p) !== String(userId));
    io.to(`user:${other}`).emit('messageRead', { conversationId, readerId: userId, readAt: new Date() });
  }
  return result.modifiedCount;
};

const getConversations = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const conversations = await Conversation.find({ participants: me }).sort({ lastMessageAt: -1 }).populate('participants', 'name avatar');
  const unread = await Message.aggregate([
    { $match: { receiver: new mongoose.Types.ObjectId(String(me)), read: false } },
    { $group: { _id: '$conversationId', count: { $sum: 1 } } },
  ]);
  const unreadMap = new Map(unread.map((u) => [String(u._id), u.count]));
  const data = conversations.map((c) => {
    const other = c.participants.find((p) => String(p._id) !== String(me)) || null;
    return {
      id: c._id,
      participant: other && { id: other._id, name: other.name, avatar: other.avatar, isOnline: presence.isOnline(other._id) },
      lastMessage: c.lastMessage, lastMessageAt: c.lastMessageAt, unreadCount: unreadMap.get(String(c._id)) || 0,
    };
  });
  return sendSuccess(res, { conversations: data }, 'Conversations fetched');
});

const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const conv = await Conversation.findById(conversationId);
  if (!conv) throw new AppError('Conversation not found', 404);
  if (!conv.participants.some((p) => String(p) === String(req.user._id))) throw new AppError('You are not part of this conversation', 403);
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 30, maxLimit: 100 });
  const [rows, total] = await Promise.all([
    Message.find({ conversationId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Message.countDocuments({ conversationId }),
  ]);
  // Page 1 = newest messages. Each page is returned oldest-first so the UI can render it directly.
  return sendSuccess(res, { messages: rows.reverse(), pagination: buildMeta({ page, limit, total }) }, 'Messages fetched');
});

const sendMessage = asyncHandler(async (req, res) => {
  const { message, conversation } = await createMessage({
    senderId: req.user._id, receiverId: req.body.receiverId, text: req.body.text, io: req.app.get('io'),
  });
  return sendSuccess(res, { message, conversationId: conversation._id }, 'Message sent', 201);
});

const markRead = asyncHandler(async (req, res) => {
  const message = await markMessageRead({ messageId: req.params.messageId, userId: req.user._id, io: req.app.get('io') });
  return sendSuccess(res, { message }, 'Message marked as read');
});

const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) throw new AppError('Message not found', 404);
  if (String(message.sender) !== String(req.user._id)) throw new AppError('You can only delete your own messages', 403);
  await message.deleteOne();
  const latest = await Message.findOne({ conversationId: message.conversationId }).sort({ createdAt: -1 });
  await Conversation.updateOne({ _id: message.conversationId }, { lastMessage: latest ? preview(latest.text) : '', ...(latest ? { lastMessageAt: latest.createdAt } : {}) });
  const io = req.app.get('io');
  if (io) io.to(`user:${message.receiver}`).emit('messageDeleted', { messageId: message._id, conversationId: message.conversationId });
  return sendSuccess(res, { messageId: message._id }, 'Message deleted');
});

module.exports = { createMessage, markMessageRead, markConversationRead, getConversations, getMessages, sendMessage, markRead, deleteMessage };
