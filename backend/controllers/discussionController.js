const DiscussionMessage = require('../models/DiscussionMessage');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const tmdb = require('../services/tmdbService');
const { createNotification } = require('./notificationController');

const shape = (m, meId) => ({
  id: m._id, movieId: m.movieId, text: m.text, parent: m.parent,
  user: m.user && { id: m.user._id, name: m.user.name, avatar: m.user.avatar },
  likeCount: m.likes.length, likedByMe: m.likes.some((u) => String(u) === String(meId)),
  createdAt: m.createdAt,
});

const getDiscussion = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  const movie = await tmdb.ensureMovieExists(movieId);
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 30, maxLimit: 100 });
  const filter = { movieId };
  const [rows, total] = await Promise.all([
    DiscussionMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name avatar'),
    DiscussionMessage.countDocuments(filter),
  ]);
  const participants = await DiscussionMessage.distinct('user', filter);
  return sendSuccess(res, {
    movie: movie && { id: movie.id, title: movie.title, year: movie.year, posterUrl: movie.posterUrl, backdropUrl: movie.backdropUrl },
    room: `movie:${movieId}`,
    participantCount: participants.length,
    messages: rows.reverse().map((m) => shape(m, req.user._id)), // oldest-first within the page
    pagination: buildMeta({ page, limit, total }),
  }, 'Discussion fetched');
});

const postMessage = asyncHandler(async (req, res) => {
  const { movieId } = req.params;
  const { text, parent } = req.body;
  await tmdb.ensureMovieExists(movieId);
  let parentDoc = null;
  if (parent) {
    parentDoc = await DiscussionMessage.findOne({ _id: parent, movieId });
    if (!parentDoc) throw new AppError('The message you are replying to was not found in this discussion', 404);
  }
  const created = await DiscussionMessage.create({ movieId, user: req.user._id, text, parent: parentDoc ? parentDoc._id : null });
  await created.populate('user', 'name avatar');
  const payload = shape(created, req.user._id);

  const io = req.app.get('io');
  if (io) io.to(`movie:${movieId}`).emit('discussionMessage', payload);
  if (parentDoc) {
    await createNotification({ io, recipient: parentDoc.user, sender: req.user._id, type: 'movie_discussion', message: `${req.user.name} replied to you in a movie discussion`, relatedId: movieId });
  }
  return sendSuccess(res, payload, 'Message posted', 201);
});

const toggleLike = asyncHandler(async (req, res) => {
  const { movieId, messageId } = req.params;
  const msg = await DiscussionMessage.findOne({ _id: messageId, movieId });
  if (!msg) throw new AppError('Message not found', 404);
  const liked = msg.likes.some((u) => String(u) === String(req.user._id));
  await DiscussionMessage.updateOne({ _id: messageId }, liked ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } });
  const likeCount = msg.likes.length + (liked ? -1 : 1);
  const io = req.app.get('io');
  if (io) io.to(`movie:${movieId}`).emit('discussionLike', { messageId, likeCount });
  return sendSuccess(res, { messageId, liked: !liked, likeCount }, liked ? 'Like removed' : 'Message liked');
});

module.exports = { getDiscussion, postMessage, toggleLike };
