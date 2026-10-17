const Swipe = require('../models/Swipe');
const Watchlist = require('../models/Watchlist');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const tmdb = require('../services/tmdbService');

const recordSwipe = asyncHandler(async (req, res) => {
  const { movieId, action } = req.body;
  const userId = req.user._id;
  const movie = await tmdb.ensureMovieExists(movieId); // null if TMDB is down: we still record the swipe

  const previous = await Swipe.findOne({ userId, movieId });
  if (previous && previous.action === action) {
    return sendSuccess(res, { swipe: previous, alreadyRecorded: true }, `You already ${action}d this movie`);
  }

  let autoWatchlisted = false;
  if (action === 'like') {
    // Liking adds to the watchlist (unless it's already there; then we must not remove it on undo).
    const result = await Watchlist.updateOne(
      { userId, movieId },
      { $setOnInsert: { addedAt: new Date() } },
      { upsert: true }
    );
    autoWatchlisted = Boolean(result.upsertedCount);
  } else if (previous?.autoWatchlisted) {
    await Watchlist.deleteOne({ userId, movieId }); // changed mind: drop the auto-added entry
  }

  const snapshot = movie ? { genreIds: movie.genreIds, language: movie.language } : {};
  const swipe = await Swipe.findOneAndUpdate(
    { userId, movieId },
    { $set: { action, autoWatchlisted, createdAt: new Date(), ...snapshot } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return sendSuccess(res, { swipe, addedToWatchlist: action === 'like' }, action === 'like' ? 'Movie liked and added to watchlist' : 'Movie disliked', 201);
});

const listSwipes = (action) => asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { userId: req.user._id, ...(action ? { action } : {}) };
  const [swipes, total] = await Promise.all([
    Swipe.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Swipe.countDocuments(filter),
  ]);
  const movies = await tmdb.getMovieSummaries(swipes.map((s) => s.movieId));
  const byId = new Map(movies.map((m) => [m.id, m]));
  const data = swipes.map((s) => ({ movieId: s.movieId, action: s.action, swipedAt: s.createdAt, movie: byId.get(s.movieId) || null }));
  return sendSuccess(res, { swipes: data, pagination: buildMeta({ page, limit, total }) }, 'Swipes fetched');
});

const undoSwipe = asyncHandler(async (req, res) => {
  const last = await Swipe.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
  if (!last) throw new AppError('No swipes to undo', 404);
  if (last.autoWatchlisted) await Watchlist.deleteOne({ userId: req.user._id, movieId: last.movieId });
  await last.deleteOne();
  return sendSuccess(res, { movieId: last.movieId, action: last.action }, 'Last swipe undone');
});

module.exports = { recordSwipe, getHistory: listSwipes(null), getLiked: listSwipes('like'), getDisliked: listSwipes('dislike'), undoSwipe };
