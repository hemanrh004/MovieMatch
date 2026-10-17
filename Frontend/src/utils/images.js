const BASE = import.meta.env.VITE_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p'
export const getPosterUrl = (p, size = 'w342') => p ? `${BASE}/${size}${p}` : null
export const getBackdropUrl = (p, size = 'w1280') => p ? `${BASE}/${size}${p}` : null
