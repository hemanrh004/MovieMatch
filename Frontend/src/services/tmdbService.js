// All TMDB traffic goes through BASE. Dev: Vite proxy (/tmdb). Prod: your Node/Express route.
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const GENRES = {28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',14:'Fantasy',27:'Horror',9648:'Mystery',10749:'Romance',878:'Sci-Fi',53:'Thriller',10752:'War',37:'Western'}
async function get(path, params = {}) {
  const r = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`)
  if (!r.ok) throw new Error(`Request failed (${r.status})`)
  return r.json()
}
export const normalize = m => ({
  id: m.id, title: m.title, originalTitle: m.original_title, overview: m.overview,
  posterPath: m.poster_path, backdropPath: m.backdrop_path, releaseDate: m.release_date,
  year: m.release_date?.slice(0, 4), rating: m.vote_average, voteCount: m.vote_count,
  popularity: m.popularity, language: m.original_language, runtime: m.runtime,
  genres: (m.genres || (m.genre_ids || []).map(id => ({ id, name: GENRES[id] }))).map(g => g.name).filter(Boolean),
})
const list = async (path, params) => { const d = await get(path, params); return { movies: d.results.map(normalize), page: d.page, totalPages: d.total_pages } }
export const getTrending = (page = 1) => list('/trending/movie/week', { page })
export const getPopular = (page = 1) => list('/movie/popular', { page })
export const getTopRated = (page = 1) => list('/movie/top_rated', { page })
export const searchMovies = (query, page = 1) => list('/search/movie', { query, page })
export const discoverMovies = ({ page = 1, genre, sort = 'popularity.desc', year, minRating, language } = {}) => {
  const p = { page, sort_by: sort, 'vote_count.gte': 100 }
  if (genre) p.with_genres = genre
  if (year) p.primary_release_year = year
  if (minRating) p['vote_average.gte'] = minRating
  if (language) p.with_original_language = language
  return list('/discover/movie', p)
}
export async function getMovieDetails(id) {
  const m = await get(`/movie/${id}`, { append_to_response: 'credits,videos,similar,recommendations' })
  return { ...normalize(m), tagline: m.tagline,
    companies: m.production_companies.map(c => c.name),
    director: m.credits.crew.find(c => c.job === 'Director')?.name,
    cast: m.credits.cast.slice(0, 12).map(c => ({ id: c.id, name: c.name, character: c.character })),
    trailerKey: m.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer')?.key,
    similar: m.similar.results.map(normalize), recommended: m.recommendations.results.map(normalize) }
}
