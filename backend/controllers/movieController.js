const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const tmdb = require('../services/tmdbService');
const { GENRES, LANGUAGES } = require('../utils/movieHelpers');

// TMDB returns a fixed 20 results per page, so `page` is supported and `limit` is not.
const listHandler = (fetcher, message) => asyncHandler(async (req, res) => {
  const data = await fetcher(req.query.page || 1, req);
  return sendSuccess(res, data, message);
});

const getTrending = listHandler((p) => tmdb.getTrendingMovies(p), 'Trending movies fetched');
const getPopular = listHandler((p) => tmdb.getPopularMovies(p), 'Popular movies fetched');
const getTopRated = listHandler((p) => tmdb.getTopRatedMovies(p), 'Top rated movies fetched');
const getNowPlaying = listHandler((p) => tmdb.getNowPlayingMovies(p), 'Now playing movies fetched');
const getUpcoming = listHandler((p) => tmdb.getUpcomingMovies(p), 'Upcoming movies fetched');
const searchMovies = listHandler((p, req) => tmdb.searchMovies(req.query.query, p), 'Search results fetched');
const getSimilar = listHandler((p, req) => tmdb.getSimilarMovies(req.params.movieId, p), 'Similar movies fetched');
const getRecommended = listHandler((p, req) => tmdb.getRecommendedMovies(req.params.movieId, p), 'Recommended movies fetched');
const getByGenre = listHandler((p, req) => tmdb.getMoviesByGenre(req.params.genreId, p), 'Movies by genre fetched');
const getByLanguage = listHandler((p, req) => tmdb.getMoviesByLanguage(req.params.language, p), 'Movies by language fetched');

const getMovie = asyncHandler(async (req, res) =>
  sendSuccess(res, await tmdb.getMovieDetails(req.params.movieId), 'Movie details fetched'));
const getCredits = asyncHandler(async (req, res) =>
  sendSuccess(res, await tmdb.getMovieCredits(req.params.movieId), 'Movie credits fetched'));
const getVideos = asyncHandler(async (req, res) =>
  sendSuccess(res, { videos: await tmdb.getMovieVideos(req.params.movieId) }, 'Movie videos fetched'));

// Static lists the frontend needs for onboarding/filters.
const getGenres = asyncHandler(async (req, res) =>
  sendSuccess(res, { genres: Object.entries(GENRES).map(([id, name]) => ({ id: Number(id), name })) }, 'Genres fetched'));
const getLanguages = asyncHandler(async (req, res) =>
  sendSuccess(res, { languages: Object.entries(LANGUAGES).map(([code, name]) => ({ code, name })) }, 'Languages fetched'));

module.exports = {
  getTrending, getPopular, getTopRated, getNowPlaying, getUpcoming, searchMovies, getSimilar, getRecommended,
  getByGenre, getByLanguage, getMovie, getCredits, getVideos, getGenres, getLanguages,
};
