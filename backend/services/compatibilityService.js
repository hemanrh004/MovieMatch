const Swipe = require('../models/Swipe');
const Watchlist = require('../models/Watchlist');
const { canonicalGenre, normalizeLanguage, languageName } = require('../utils/movieHelpers');

const WEIGHTS = { genres: 0.3, languages: 0.15, likedMovies: 0.35, watchlist: 0.2 };

const intersect = (a, b) => [...a].filter((x) => b.has(x));
// Dice coefficient: 2|A∩B| / (|A|+|B|). Returns null when neither side has data.
const dice = (a, b) => (a.size + b.size === 0 ? null : (2 * intersect(a, b).length) / (a.size + b.size));

async function loadTaste(users) {
  const ids = users.map((u) => u._id);
  const [likes, watch] = await Promise.all([
    Swipe.find({ userId: { $in: ids }, action: 'like' }).select('userId movieId').lean(),
    Watchlist.find({ userId: { $in: ids } }).select('userId movieId').lean(),
  ]);
  const taste = new Map(users.map((u) => [String(u._id), {
    genres: new Set((u.genres || []).map(canonicalGenre).filter(Boolean)),
    languages: new Set((u.languages || []).map(normalizeLanguage).filter(Boolean)),
    liked: new Set(), watchlist: new Set(),
  }]));
  likes.forEach((s) => taste.get(String(s.userId))?.liked.add(s.movieId));
  watch.forEach((w) => taste.get(String(w.userId))?.watchlist.add(w.movieId));
  return taste;
}

function compareTaste(a, b) {
  const parts = {
    genres: dice(a.genres, b.genres),
    languages: dice(a.languages, b.languages),
    likedMovies: dice(a.liked, b.liked),
    watchlist: dice(a.watchlist, b.watchlist),
  };
  let total = 0; let weight = 0;
  for (const [k, v] of Object.entries(parts)) if (v !== null) { total += v * WEIGHTS[k]; weight += WEIGHTS[k]; }
  const allA = new Set([...a.liked, ...a.watchlist]);
  const allB = new Set([...b.liked, ...b.watchlist]);
  const pct = (v) => (v === null ? null : Math.round(v * 100));
  return {
    score: weight ? Math.round((total / weight) * 100) : 0,
    commonGenres: intersect(a.genres, b.genres),
    commonLanguages: intersect(a.languages, b.languages).map(languageName),
    commonMovies: intersect(allA, allB),
    breakdown: { genres: pct(parts.genres), languages: pct(parts.languages), likedMovies: pct(parts.likedMovies), watchlist: pct(parts.watchlist) },
  };
}

// Compare one user against many with just two DB queries (used by friend suggestions).
async function compareMany(me, others) {
  const taste = await loadTaste([me, ...others]);
  const mine = taste.get(String(me._id));
  return others.map((o) => ({ user: o, compatibility: compareTaste(mine, taste.get(String(o._id))) }));
}

async function compareUsers(userA, userB) {
  const [{ compatibility }] = await compareMany(userA, [userB]);
  return compatibility;
}

module.exports = { compareUsers, compareMany };
