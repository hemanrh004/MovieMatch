// Backend-ready interface. Swap bodies for GET /api/movies/recommendations etc.
// No fake "AI" here: until the backend exists we fall back to plain TMDB lists.
import { getTrending, getPopular, getMovieDetails } from './tmdbService.js'
export const getTrendingMovies = () => getTrending()
export const getRecommendedMovies = () => getPopular()   // TODO: GET /api/movies/recommendations
export const getPersonalizedFeed = () => getPopular()    // TODO: GET /api/movies/feed
export const getSimilarMovies = async id => (await getMovieDetails(id)).similar
export const getMoviesBasedOnLikes = async likedIds => likedIds.length ? getSimilarMovies(likedIds[0]) : []
