const User = require('../models/User');
const Swipe = require('../models/Swipe');
const Watchlist = require('../models/Watchlist');
const Friend = require('../models/Friend');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/apiResponse');
const { canonicalGenre, normalizeLanguage } = require('../utils/movieHelpers');
const { compareUsers } = require('../services/compatibilityService');

const acceptedFilter = (id) => ({ status: 'accepted', $or: [{ requester: id }, { recipient: id }] });

const getStats = async (userId) => {
  const [liked, disliked, watchlist, friends] = await Promise.all([
    Swipe.countDocuments({ userId, action: 'like' }),
    Swipe.countDocuments({ userId, action: 'dislike' }),
    Watchlist.countDocuments({ userId }),
    Friend.countDocuments(acceptedFilter(userId)),
  ]);
  return { moviesLiked: liked, moviesDisliked: disliked, watchlistCount: watchlist, friendsCount: friends };
};

// Converts user-friendly genre/language names into canonical stored values; rejects unknown ones.
const normalizePreferences = (body) => {
  const out = {};
  if (body.genres) {
    const bad = body.genres.filter((g) => !canonicalGenre(g));
    if (bad.length) throw new AppError(`Unknown genre(s): ${bad.join(', ')}`, 400);
    out.genres = [...new Set(body.genres.map(canonicalGenre))];
  }
  if (body.languages) {
    const bad = body.languages.filter((l) => !normalizeLanguage(l));
    if (bad.length) throw new AppError(`Unknown language(s): ${bad.join(', ')}. Use names like "Korean" or codes like "ko"`, 400);
    out.languages = [...new Set(body.languages.map(normalizeLanguage))];
  }
  if (body.favoriteMovies) out.favoriteMovies = body.favoriteMovies;
  return out;
};

const getProfile = asyncHandler(async (req, res) =>
  sendSuccess(res, { user: req.user, stats: await getStats(req.user._id) }, 'Profile fetched'));

const updateProfile = asyncHandler(async (req, res) => {
  const updates = { ...normalizePreferences(req.body) };
  ['name', 'bio', 'avatar'].forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; }); // whitelist: never email/password
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
  return sendSuccess(res, { user }, 'Profile updated');
});

const updatePreferences = asyncHandler(async (req, res) => {
  const updates = { ...normalizePreferences(req.body), onboardingCompleted: true };
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
  return sendSuccess(res, { user }, 'Preferences saved');
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('name avatar bio genres languages favoriteMovies createdAt');
  if (!user) throw new AppError('User not found', 404);
  let friendship = 'self';
  if (String(user._id) !== String(req.user._id)) {
    const rel = await Friend.findOne({ $or: [{ requester: req.user._id, recipient: user._id }, { requester: user._id, recipient: req.user._id }] });
    if (!rel || rel.status === 'rejected') friendship = 'none';
    else if (rel.status === 'accepted') friendship = 'friends';
    else if (rel.status === 'blocked') friendship = 'blocked';
    else friendship = String(rel.requester) === String(req.user._id) ? 'request_sent' : 'request_received';
  }
  return sendSuccess(res, { user, stats: await getStats(user._id), friendship }, 'User fetched');
});

const getCompatibility = asyncHandler(async (req, res) => {
  const other = await User.findById(req.params.id);
  if (!other) throw new AppError('User not found', 404);
  if (String(other._id) === String(req.user._id)) throw new AppError('You cannot compare with yourself', 400);
  const compatibility = await compareUsers(req.user, other);
  return sendSuccess(res, { user: { id: other._id, name: other.name, avatar: other.avatar }, ...compatibility }, 'Compatibility calculated');
});

module.exports = { getProfile, updateProfile, updatePreferences, getUserById, getCompatibility };
