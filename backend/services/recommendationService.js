const mongoose = require('mongoose');
const User = require('../models/User');
const Swipe = require('../models/Swipe');
const Watchlist = require('../models/Watchlist');
const tmdb = require('./tmdbService');
const { GENRES, genreNameToId, normalizeLanguage, languageName } = require('../utils/movieHelpers');

/*
 * Content-based recommender (collaborative signal from similar users is blended in).
 * Pipeline: buildSignals -> gatherCandidates -> scoreMovie -> rank.
 * Each stage is a separate function so a collaborative-filtering or ML model can replace any stage.
 * "Updating signals" after a swipe is automatic: signals are derived from Swipe/Watchlist documents.
 */
const W = { prefGenre: 3, prefGenreCap: 9, prefLanguage: 2, affinityPos: 2, affinityNeg: 2.5, similarToLiked: 4, peers: 3, rating: 0.4, popularity: 0.5 };

const countBy = (items, pick) => items.reduce((m, item) => {
  for (const k of pick(item)) m.set(k, (m.get(k) || 0) + 1);
  return m;
}, new Map());

async function buildSignals(userId) {
  const [user, swipes, watchlist] = await Promise.all([
    User.findById(userId).lean(),
    Swipe.find({ userId }).sort({ createdAt: -1 }).limit(500).lean(),
    Watchlist.find({ userId }).select('movieId').lean(),
  ]);
  const liked = swipes.filter((s) => s.action === 'like');
  const disliked = swipes.filter((s) => s.action === 'dislike');
  return {
    userId,
    liked, disliked,
    likedGenres: countBy(liked, (s) => s.genreIds || []),
    dislikedGenres: countBy(disliked, (s) => s.genreIds || []),
    preferredGenreIds: new Set((user?.genres || []).map(genreNameToId).filter(Boolean)),
    preferredLanguages: new Set((user?.languages || []).map(normalizeLanguage).filter(Boolean)),
    excludeIds: new Set([...swipes.map((s) => s.movieId), ...watchlist.map((w) => w.movieId)]),
    recentLikedIds: liked.slice(0, 3).map((s) => s.movieId),
    allLikedIds: liked.map((s) => s.movieId),
  };
}

// "Similar users": people who liked the same movies as you -> movies they liked that you haven't seen.
async function similarUserMovies(userId, likedIds) {
  if (!likedIds.length) return new Map();
  const uid = new mongoose.Types.ObjectId(String(userId));
  const peers = await Swipe.aggregate([
    { $match: { movieId: { $in: likedIds.slice(0, 100) }, action: 'like', userId: { $ne: uid } } },
    { $group: { _id: '$userId', overlap: { $sum: 1 } } },
    { $sort: { overlap: -1 } },
    { $limit: 20 },
  ]);
  if (!peers.length) return new Map();
  const picks = await Swipe.aggregate([
    { $match: { userId: { $in: peers.map((p) => p._id) }, action: 'like', movieId: { $nin: likedIds } } },
    { $group: { _id: '$movieId', peerCount: { $sum: 1 } } },
    { $sort: { peerCount: -1 } },
    { $limit: 20 },
  ]);
  return new Map(picks.map((p) => [p._id, p.peerCount]));
}

async function gatherCandidates(signals, page = 1) {
  const candidates = new Map(); // movieId -> { movie, sources:Set }
  const add = (movies, source) => movies.forEach((movie) => {
    const entry = candidates.get(movie.id) || { movie, sources: new Set() };
    entry.sources.add(source);
    candidates.set(movie.id, entry);
  });

  // Genres: explicit preferences plus the genres the user keeps liking.
  const topLiked = [...signals.likedGenres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
  const genreIds = [...new Set([...signals.preferredGenreIds, ...topLiked])].slice(0, 6);
  const languages = [...signals.preferredLanguages].slice(0, 2);

  const [recentLiked, peerPicks] = await Promise.all([
    tmdb.getMovieSummaries(signals.recentLikedIds),
    similarUserMovies(signals.userId, signals.allLikedIds),
  ]);
  const titles = new Map(recentLiked.map((m) => [m.id, m.title]));

  const jobs = [];
  if (genreIds.length) {
    jobs.push(tmdb.discoverMovies({ with_genres: genreIds.join('|'), page }).then((r) => add(r.movies, 'genre')));
    jobs.push(tmdb.discoverMovies({ with_genres: genreIds.join('|'), sort_by: 'vote_average.desc', 'vote_count.gte': 500, page }).then((r) => add(r.movies, 'genre')));
  }
  languages.forEach((lang) => jobs.push(
    tmdb.discoverMovies({ with_original_language: lang, ...(genreIds.length ? { with_genres: genreIds.join('|') } : {}), page }).then((r) => add(r.movies, 'language'))
  ));
  signals.recentLikedIds.forEach((id) => jobs.push(
    tmdb.getRecommendedMovies(id).then((r) => add(r.movies, `similar:${id}`))
  ));
  if (peerPicks.size) {
    jobs.push(tmdb.getMovieSummaries([...peerPicks.keys()].slice(0, 10)).then((m) => add(m, 'peers')));
  }
  if (!jobs.length) {
    jobs.push(tmdb.getTrendingMovies(page).then((r) => add(r.movies, 'trending')));
    jobs.push(tmdb.getPopularMovies(page).then((r) => add(r.movies, 'trending')));
  }
  await Promise.allSettled(jobs); // one failing TMDB call must not break the whole feed

  return { candidates: [...candidates.values()], titles, peerPicks };
}

function scoreMovie(entry, signals, ctx) {
  const { movie, sources } = entry;
  let score = 0;
  const reasons = [];

  const matched = movie.genreIds.filter((g) => signals.preferredGenreIds.has(g));
  if (matched.length) {
    score += Math.min(matched.length * W.prefGenre, W.prefGenreCap);
    reasons.push(`Matches your favorite genres: ${matched.map((g) => GENRES[g]).join(', ')}`);
  }
  if (signals.preferredLanguages.has(movie.language)) {
    score += W.prefLanguage;
    reasons.push(`In ${languageName(movie.language)}, one of your languages`);
  }
  // Learned affinity from swipes: genres you like more than dislike help; the reverse hurts.
  let affinityScore = 0;
  const avoided = [];
  for (const g of movie.genreIds) {
    const net = Math.max(-5, Math.min(5, (signals.likedGenres.get(g) || 0) - (signals.dislikedGenres.get(g) || 0)));
    if (net > 0) affinityScore += (net / 5) * W.affinityPos;
    if (net < 0) { affinityScore += (net / 5) * W.affinityNeg; avoided.push(GENRES[g]); }
  }
  score += affinityScore;
  if (affinityScore > 0.5) reasons.push('Similar to genres you keep liking');
  if (avoided.length && affinityScore < 0) reasons.push(`Lower priority: you often skip ${avoided.join(', ')}`);

  for (const src of sources) {
    if (src.startsWith('similar:')) {
      score += W.similarToLiked;
      const title = ctx.titles.get(Number(src.split(':')[1]));
      reasons.push(title ? `Because you liked ${title}` : 'Similar to a movie you liked');
      break;
    }
  }
  if (ctx.peerPicks.has(movie.id)) {
    score += Math.min(ctx.peerPicks.get(movie.id), W.peers);
    reasons.push('Liked by people with similar taste');
  }
  score += (movie.rating || 0) * W.rating + Math.min(movie.popularity / 100, 1) * W.popularity;
  return { score, reasons };
}

// Scores and sorts any list of movies for a user (also used by the AI assistant).
function rankMovies(movies, signals, ctx = { titles: new Map(), peerPicks: new Map() }) {
  return movies
    .filter((m) => !signals.excludeIds.has(m.id) && !m.adult && m.posterPath)
    .map((movie) => {
      const { score, reasons } = scoreMovie({ movie, sources: new Set() }, signals, ctx);
      return { ...movie, score: Math.round(score * 10) / 10, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

function buildReason(signals) {
  if (signals.liked.length) return 'Recommended based on your favorite genres and recent likes';
  if (signals.preferredGenreIds.size || signals.preferredLanguages.size) return 'Recommended based on your favorite genres and languages';
  return 'Popular picks to get you started. Swipe on a few movies to personalize this feed';
}

async function getRecommendations(userId, { page = 1, limit = 20 } = {}) {
  const signals = await buildSignals(userId);
  const { candidates, titles, peerPicks } = await gatherCandidates(signals, page);
  const ranked = candidates
    .filter(({ movie }) => !signals.excludeIds.has(movie.id) && !movie.adult && movie.posterPath)
    .map((entry) => {
      const { score, reasons } = scoreMovie(entry, signals, { titles, peerPicks });
      return { ...entry.movie, score: Math.round(score * 10) / 10, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return { movies: ranked, reason: buildReason(signals), page };
}

module.exports = { getRecommendations, buildSignals, rankMovies };
