const Friend = require('../models/Friend');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { createNotification } = require('./notificationController');
const { compareMany } = require('../services/compatibilityService');
const presence = require('../socket/presence');

const PUBLIC_FIELDS = 'name avatar bio genres languages';
const between = (a, b) => ({ $or: [{ requester: a, recipient: b }, { requester: b, recipient: a }] });

const sendRequest = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const { userId } = req.params;
  if (String(me) === userId) throw new AppError("You can't send a friend request to yourself", 400);
  const target = await User.findById(userId).select('_id');
  if (!target) throw new AppError('User not found', 404);

  const existing = await Friend.findOne(between(me, userId));
  if (existing) {
    if (existing.status === 'accepted') throw new AppError('You are already friends', 409);
    if (existing.status === 'blocked') throw new AppError('Unable to send a request to this user', 403);
    if (existing.status === 'pending') {
      throw new AppError(String(existing.requester) === String(me)
        ? 'Friend request already sent' : 'This user already sent you a request. Accept it instead', 409);
    }
    // Previously rejected: allow a fresh request.
    existing.requester = me; existing.recipient = userId; existing.status = 'pending';
    await existing.save();
  } else {
    await Friend.create({ requester: me, recipient: userId });
  }
  await createNotification({ io: req.app.get('io'), recipient: userId, sender: me, type: 'friend_request', message: `${req.user.name} sent you a friend request`, relatedId: me });
  return sendSuccess(res, { userId, status: 'pending' }, 'Friend request sent', 201);
});

const respond = (status, message, notify) => asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const request = await Friend.findOne({ requester: userId, recipient: req.user._id, status: 'pending' });
  if (!request) throw new AppError('No pending friend request from this user', 404);
  request.status = status;
  await request.save();
  if (notify) {
    await createNotification({ io: req.app.get('io'), recipient: userId, sender: req.user._id, type: 'friend_accepted', message: `${req.user.name} accepted your friend request`, relatedId: req.user._id });
  }
  return sendSuccess(res, { userId, status }, message);
});

const acceptRequest = respond('accepted', 'Friend request accepted', true);
const rejectRequest = respond('rejected', 'Friend request rejected', false);

// Removes a friendship, or cancels a request you sent.
const removeFriend = asyncHandler(async (req, res) => {
  const rel = await Friend.findOne({ ...between(req.user._id, req.params.userId), status: { $in: ['accepted', 'pending'] } });
  if (!rel) throw new AppError('No friendship or pending request found', 404);
  if (rel.status === 'pending' && String(rel.requester) !== String(req.user._id)) {
    throw new AppError('Use the reject endpoint to decline a request', 400);
  }
  await rel.deleteOne();
  return sendSuccess(res, { userId: req.params.userId }, 'Friend removed');
});

const getFriends = asyncHandler(async (req, res) => {
  const me = String(req.user._id);
  const rels = await Friend.find({ status: 'accepted', $or: [{ requester: me }, { recipient: me }] })
    .populate('requester', PUBLIC_FIELDS).populate('recipient', PUBLIC_FIELDS).sort({ updatedAt: -1 });
  const friends = rels.map((r) => {
    const other = String(r.requester._id) === me ? r.recipient : r.requester;
    return { ...other.toObject(), id: other._id, isOnline: presence.isOnline(other._id), friendsSince: r.updatedAt };
  });
  return sendSuccess(res, { friends, total: friends.length }, 'Friends fetched');
});

const getRequests = asyncHandler(async (req, res) => {
  const [incoming, sent] = await Promise.all([
    Friend.find({ recipient: req.user._id, status: 'pending' }).populate('requester', PUBLIC_FIELDS).sort({ createdAt: -1 }),
    Friend.find({ requester: req.user._id, status: 'pending' }).populate('recipient', PUBLIC_FIELDS).sort({ createdAt: -1 }),
  ]);
  return sendSuccess(res, {
    incoming: incoming.map((r) => ({ requestId: r._id, user: r.requester, createdAt: r.createdAt })),
    sent: sent.map((r) => ({ requestId: r._id, user: r.recipient, createdAt: r.createdAt })),
  }, 'Friend requests fetched');
});

// Users who aren't related to you yet, ranked by taste compatibility.
const getSuggestions = asyncHandler(async (req, res) => {
  const me = req.user;
  const rels = await Friend.find({ $or: [{ requester: me._id }, { recipient: me._id }] }).select('requester recipient');
  const exclude = new Set([String(me._id)]);
  rels.forEach((r) => { exclude.add(String(r.requester)); exclude.add(String(r.recipient)); });

  const base = { _id: { $nin: [...exclude] } };
  let pool = [];
  if (me.genres.length || me.languages.length) {
    pool = await User.find({ ...base, $or: [{ genres: { $in: me.genres } }, { languages: { $in: me.languages } }] }).select(PUBLIC_FIELDS).limit(50);
  }
  if (pool.length < 10) { // new platform / sparse profile: top up with other users
    const have = pool.map((u) => String(u._id));
    const more = await User.find({ _id: { $nin: [...exclude, ...have] } }).select(PUBLIC_FIELDS).limit(20 - pool.length);
    pool = pool.concat(more);
  }
  const ranked = (await compareMany(me, pool))
    .map(({ user, compatibility }) => ({ user, compatibility }))
    .sort((a, b) => b.compatibility.score - a.compatibility.score)
    .slice(0, 20);
  return sendSuccess(res, { suggestions: ranked }, 'Friend suggestions fetched');
});

module.exports = { sendRequest, acceptRequest, rejectRequest, removeFriend, getFriends, getRequests, getSuggestions };
