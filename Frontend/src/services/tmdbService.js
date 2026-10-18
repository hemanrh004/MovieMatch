const BASE ='http://localhost:5000';

async function get(path, params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(
    `${BASE}/api/movies/${path}${query ? `?${query}` : ''}`
  );

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  const result = await response.json();

  // Your backend returns { success, message, data: { movies: [...] } }
  const payload = result.data ?? result;

  return {
    ...payload,
    movies: payload.movies ?? payload.results ?? [],
  };
}

export const GENRES = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  14: 'Fantasy',
  27: 'Horror',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
};

const normalize = (movie) => ({
  ...movie,
  id: movie.id,
  title: movie.title,
  originalTitle: movie.originalTitle ?? movie.original_title,
  overview: movie.overview,
  posterPath: movie.posterPath ?? movie.poster_path,
  backdropPath: movie.backdropPath ?? movie.backdrop_path,
  releaseDate: movie.releaseDate ?? movie.release_date,
  year: movie.year ?? movie.releaseDate?.slice(0, 4) ?? movie.release_date?.slice(0, 4),
  rating: movie.rating ?? movie.vote_average,
  voteCount: movie.voteCount ?? movie.vote_count,
  popularity: movie.popularity,
  language: movie.language ?? movie.original_language,
  runtime: movie.runtime,
  genres: movie.genres ?? (movie.genre_ids ?? []).map(id => ({
    id,
    name: GENRES[id] ?? 'Other',
  })),
});

const list = async (path, params = {}) => {
  const data = await get(path, params);
  return {
    ...data,
    movies: data.movies.map(normalize),
  };
};

export const getTrending = (page = 1) =>
  list('trending', { page });

export const getPopular = (page = 1) =>
  list('popular', { page });

export const getTopRated = (page = 1) =>
  list('top-rated', { page });

export const searchMovies = (query, page = 1) =>
  list('search', { query, page });

export const discoverMovies = ({
  page = 1,
  genre,
  year,
  minRating,
  language,
} = {}) => {
  const params = { page };

  if (genre) params.genre = genre;
  if (year) params.year = year;
  if (minRating) params.minRating = minRating;
  if (language) params.language = language;

  return list('discover', params);
};

export async function getMovieDetails(id) {
  const result = await get(`${id}`);
  return normalize(result.movie ?? result);
}