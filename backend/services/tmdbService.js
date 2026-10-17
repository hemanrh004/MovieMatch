const { tmdbClient } = require('../config/tmdb');
const AppError = require('../utils/AppError');
const { formatMovie, formatMovieDetails, formatCast, isValidMovieId } = require('../utils/movieHelpers');

// ---- Tiny in-memory TTL cache. Swap `cacheGet`/`cacheSet` for Redis later without touching callers. ----
const cache = new Map();
const TTL = { short: 60 * 1000, medium: 10 * 60 * 1000, long: 60 * 60 * 1000 };
const cacheGet = (key) => {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) { cache.delete(key); return undefined; }
  return hit.value;
};
const cacheSet = (key, value, ttl) => {
  if (cache.size > 1000) cache.delete(cache.keys().next().value); // simple size cap
  cache.set(key, { value, expires: Date.now() + ttl });
};

const mapTmdbError = (err) => {
  if (err.isOperational) return err;
  if (err.response) {
    const { status } = err.response;
    if (status === 401) return new AppError('TMDB authentication failed. Check TMDB_ACCESS_TOKEN in .env', 502);
    if (status === 404) return new AppError('Movie not found', 404);
    if (status === 429) return new AppError('TMDB rate limit reached. Please try again shortly', 429);
    return new AppError(`TMDB request failed (${status})`, 502);
  }
  return new AppError('Movie service is temporarily unreachable. Please try again', 503);
};

async function request(path, params = {}, ttl = TTL.medium) {
  if (!process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_ACCESS_TOKEN.startsWith('your_')) {
    throw new AppError('TMDB is not configured. Set TMDB_ACCESS_TOKEN in your .env file', 503);
  }
  const key = `${path}?${JSON.stringify(params)}`;
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;
  try {
    const { data } = await tmdbClient.get(path, { params });
    cacheSet(key, data, ttl);
    return data;
  } catch (err) {
    throw mapTmdbError(err);
  }
}

const assertId = (movieId) => {
  if (!isValidMovieId(movieId)) throw new AppError('Invalid movie ID', 400);
  return Number(movieId);
};

const list = async (path, params = {}, ttl) => {
  const data = await request(path, { language: 'en-US', include_adult: false, ...params }, ttl);
  return {
    movies: (data.results || []).map(formatMovie),
    page: data.page,
    totalPages: Math.min(data.total_pages || 1, 500),
    totalResults: data.total_results || 0,
  };
};

const getTrendingMovies = (page = 1, window = 'week') => list(`/trending/movie/${window}`, { page }, TTL.short * 5);
const getPopularMovies = (page = 1) => list('/movie/popular', { page });
const getTopRatedMovies = (page = 1) => list('/movie/top_rated', { page });
const getNowPlayingMovies = (page = 1) => list('/movie/now_playing', { page });
const getUpcomingMovies = (page = 1) => list('/movie/upcoming', { page });
const searchMovies = (query, page = 1) => list('/search/movie', { query, page }, TTL.short * 5);

const getMovieDetails = async (movieId) => {
  const id = assertId(movieId);
  const data = await request(`/movie/${id}`, { language: 'en-US', append_to_response: 'credits,videos' }, TTL.long);
  return formatMovieDetails(data);
};

const getMovieCredits = async (movieId) => {
  const id = assertId(movieId);
  const data = await request(`/movie/${id}/credits`, {}, TTL.long);
  return {
    cast: formatCast(data.cast, 20),
    director: (data.crew || []).find((c) => c.job === 'Director')?.name || null,
    crew: (data.crew || [])
      .filter((c) => ['Director', 'Writer', 'Screenplay', 'Producer', 'Original Music Composer'].includes(c.job))
      .slice(0, 12).map((c) => ({ id: c.id, name: c.name, job: c.job })),
  };
};

const getMovieVideos = async (movieId) => {
  const id = assertId(movieId);
  const data = await request(`/movie/${id}/videos`, { language: 'en-US' }, TTL.long);
  return (data.results || []).filter((v) => v.site === 'YouTube')
    .map((v) => ({ key: v.key, name: v.name, type: v.type, official: v.official, url: `https://www.youtube.com/watch?v=${v.key}` }));
};

const getSimilarMovies = (movieId, page = 1) => list(`/movie/${assertId(movieId)}/similar`, { page });
const getRecommendedMovies = (movieId, page = 1) => list(`/movie/${assertId(movieId)}/recommendations`, { page });

// Generic /discover wrapper used by recommendations and the AI assistant.
const discoverMovies = (params = {}) => list('/discover/movie', { sort_by: 'popularity.desc', 'vote_count.gte': 50, ...params });
const getMoviesByGenre = (genreId, page = 1) => discoverMovies({ with_genres: genreId, page });
const getMoviesByLanguage = (language, page = 1) => discoverMovies({ with_original_language: language, page });

// Verifies the movie exists on TMDB. Only a real 404 blocks the caller; outages return null.
const ensureMovieExists = async (movieId) => {
  try {
    return await getMovieDetails(movieId);
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 400) throw err;
    return null;
  }
};

// Turns stored movie ids into movie objects (order preserved, unavailable ones skipped).
const getMovieSummaries = async (ids) => {
  const results = await Promise.allSettled(ids.map((id) => getMovieDetails(id)));
  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
};

module.exports = {
  getTrendingMovies, getPopularMovies, getTopRatedMovies, getNowPlayingMovies, getUpcomingMovies, searchMovies,
  getMovieDetails, getMovieCredits, getMovieVideos, getSimilarMovies, getRecommendedMovies,
  getMoviesByGenre, getMoviesByLanguage, discoverMovies, ensureMovieExists, getMovieSummaries,
};
