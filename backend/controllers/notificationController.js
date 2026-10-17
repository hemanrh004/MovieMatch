const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');

/**
 * Creates a notification and pushes it live over Socket.IO. Never throws, so a failed
 * notification can't break the action that triggered it. `dedupe` merges unread duplicates.
 */
const createNotification = async ({ io, recipient, sender, type, message, relatedId, dedupe = false }) => {
  try {
    if (String(recipient) === String(sender)) return null;
    const doc = { recipient, sender, type, message, relatedId: relatedId ? String(relatedId) : undefined };
    let notification;
    if (dedupe) {
      notification = await Notification.findOneAndUpdate(
        { recipient, sender, type, relatedId: doc.relatedId, read: false },
        { $set: { message } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      notification = await Notification.create(doc);
    }
    if (io) io.to(`user:${recipient}`).emit('notification', notification);
    return notification;
  } catch (err) {
    console.error('createNotification failed:', err.message);
    return null;
  }
};

const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = { recipient: req.user._id };
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('sender', 'name avatar'),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read: false }),
  ]);
  return sendSuccess(res, { notifications: items, unreadCount, pagination: buildMeta({ page, limit, total }) }, 'Notifications fetched');
});

const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { read: true }, { new: true });
  if (!n) throw new AppError('Notification not found', 404);
  return sendSuccess(res, n, 'Notification marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  return sendSuccess(res, { updated: result.modifiedCount }, 'All notifications marked as read');
});

const deleteNotification = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  if (!n) throw new AppError('Notification not found', 404);
  return sendSuccess(res, {}, 'Notification deleted');
});

module.exports = { createNotification, getNotifications, markRead, markAllRead, deleteNotification };
