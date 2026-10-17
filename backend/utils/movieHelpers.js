const { IMAGE_BASE_URL } = require('../config/tmdb');

// Canonical genre names (TMDB genre ids). "Sci-Fi" matches the React frontend.
const GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary',
  18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller',
  10752: 'War', 37: 'Western',
};
const GENRE_ALIASES = { 'science fiction': 878, 'sci fi': 878, scifi: 878, 'sci-fi': 878, romcom: 10749 };
const GENRE_NAME_TO_ID = Object.fromEntries(Object.entries(GENRES).map(([id, n]) => [n.toLowerCase(), Number(id)]));

const genreNameToId = (name) => {
  if (name === undefined || name === null) return null;
  const key = String(name).trim().toLowerCase();
  return GENRE_NAME_TO_ID[key] || GENRE_ALIASES[key] || null;
};
const canonicalGenre = (name) => { const id = genreNameToId(name); return id ? GENRES[id] : null; };

// ISO 639-1 codes -> display names.
const LANGUAGES = {
  en: 'English', hi: 'Hindi', ko: 'Korean', ja: 'Japanese', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', zh: 'Chinese', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', kn: 'Kannada', bn: 'Bengali',
  mr: 'Marathi', pa: 'Punjabi', pt: 'Portuguese', ru: 'Russian', tr: 'Turkish', th: 'Thai', ar: 'Arabic',
  id: 'Indonesian', sv: 'Swedish', da: 'Danish', no: 'Norwegian', nl: 'Dutch', pl: 'Polish', fa: 'Persian', he: 'Hebrew',
};
const LANGUAGE_NAME_TO_CODE = Object.fromEntries(Object.entries(LANGUAGES).map(([c, n]) => [n.toLowerCase(), c]));

// Accepts "ko", "Korean", "korean" -> "ko". Returns null if unknown.
const normalizeLanguage = (input) => {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (LANGUAGES[key]) return key;
  return LANGUAGE_NAME_TO_CODE[key] || null;
};
const languageName = (code) => LANGUAGES[code] || code;

const isValidMovieId = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

// Image helpers: only TMDB paths are stored/returned raw; URLs are built here.
const getPosterUrl = (path, size = 'w500') => (path ? `${IMAGE_BASE_URL}/${size}${path}` : null);
const getBackdropUrl = (path, size = 'w1280') => (path ? `${IMAGE_BASE_URL}/${size}${path}` : null);
const getProfileUrl = (path, size = 'w185') => (path ? `${IMAGE_BASE_URL}/${size}${path}` : null);

// Same shape the React frontend normalizes to.
const formatMovie = (m) => {
  const genreIds = m.genre_ids || (m.genres || []).map((g) => g.id);
  return {
    id: m.id,
    title: m.title,
    originalTitle: m.original_title,
    overview: m.overview || '',
    posterPath: m.poster_path || null,
    backdropPath: m.backdrop_path || null,
    posterUrl: getPosterUrl(m.poster_path),
    backdropUrl: getBackdropUrl(m.backdrop_path),
    releaseDate: m.release_date || null,
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    rating: m.vote_average ?? 0,
    voteCount: m.vote_count ?? 0,
    popularity: m.popularity ?? 0,
    language: m.original_language,
    runtime: m.runtime ?? null,
    adult: Boolean(m.adult),
    genreIds,
    genres: genreIds.map((id) => GENRES[id]).filter(Boolean),
  };
};

const formatCast = (cast = [], limit = 12) =>
  cast.slice(0, limit).map((c) => ({
    id: c.id, name: c.name, character: c.character, profilePath: c.profile_path || null, profileUrl: getProfileUrl(c.profile_path),
  }));

const pickTrailerKey = (videos = []) => {
  const yt = videos.filter((v) => v.site === 'YouTube');
  const best = yt.find((v) => v.type === 'Trailer' && v.official) || yt.find((v) => v.type === 'Trailer') || yt[0];
  return best ? best.key : null;
};

const formatMovieDetails = (m) => ({
  ...formatMovie(m),
  tagline: m.tagline || '',
  status: m.status,
  homepage: m.homepage || null,
  budget: m.budget,
  revenue: m.revenue,
  companies: (m.production_companies || []).map((c) => c.name),
  spokenLanguages: (m.spoken_languages || []).map((l) => l.english_name),
  director: m.credits?.crew?.find((c) => c.job === 'Director')?.name || null,
  cast: formatCast(m.credits?.cast),
  trailerKey: pickTrailerKey(m.videos?.results),
});

module.exports = {
  GENRES, LANGUAGES, genreNameToId, canonicalGenre, normalizeLanguage, languageName, isValidMovieId,
  getPosterUrl, getBackdropUrl, getProfileUrl, formatMovie, formatCast, pickTrailerKey, formatMovieDetails,
};
