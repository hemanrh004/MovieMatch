const Watchlist = require('../models/Watchlist');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const tmdb = require('../services/tmdbService');

const addToWatchlist = asyncHandler(async (req, res) => {
  const { movieId } = req.body;
  await tmdb.ensureMovieExists(movieId); // 404 for non-existent movies
  const result = await Watchlist.updateOne(
    { userId: req.user._id, movieId },
    { $setOnInsert: { addedAt: new Date() } },
    { upsert: true }
  );
  if (!result.upsertedCount) throw new AppError('Movie is already in your watchlist', 409);
  return sendSuccess(res, { movieId }, 'Movie added to watchlist', 201);
});

const getWatchlist = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { userId: req.user._id };
  const [items, total] = await Promise.all([
    Watchlist.find(filter).sort({ addedAt: -1 }).skip(skip).limit(limit).lean(),
    Watchlist.countDocuments(filter),
  ]);
  const movies = await tmdb.getMovieSummaries(items.map((i) => i.movieId));
  const addedAt = new Map(items.map((i) => [i.movieId, i.addedAt]));
  const data = movies.map((m) => ({ ...m, addedAt: addedAt.get(m.id) }));
  return sendSuccess(res, { movies: data, pagination: buildMeta({ page, limit, total }) }, 'Watchlist fetched');
});

const removeFromWatchlist = asyncHandler(async (req, res) => {
  const removed = await Watchlist.findOneAndDelete({ userId: req.user._id, movieId: req.params.movieId });
  if (!removed) throw new AppError('Movie is not in your watchlist', 404);
  return sendSuccess(res, { movieId: req.params.movieId }, 'Movie removed from watchlist');
});

const checkWatchlist = asyncHandler(async (req, res) => {
  const exists = await Watchlist.exists({ userId: req.user._id, movieId: req.params.movieId });
  return sendSuccess(res, { movieId: req.params.movieId, inWatchlist: Boolean(exists) }, 'Watchlist status fetched');
});

module.exports = { addToWatchlist, getWatchlist, removeFromWatchlist, checkWatchlist };
