// localStorage adapter. Replace each body with its API call (POST /api/movies/:id/like, /api/watchlist ...).
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))
export const getWatchlist = () => read('mm_watchlist', [])
export const addToWatchlist = movie => { const l = getWatchlist(); if (!l.some(m => m.id === movie.id)) write('mm_watchlist', [{ ...movie, watched: false, addedAt: Date.now() }, ...l]) }
export const removeFromWatchlist = id => write('mm_watchlist', getWatchlist().filter(m => m.id !== id))
export const setWatched = (id, watched) => write('mm_watchlist', getWatchlist().map(m => m.id === id ? { ...m, watched } : m))
export const getInteractions = () => read('mm_interactions', { liked: [], disliked: [] })
export const likeMovie = id => { const i = getInteractions(); write('mm_interactions', { liked: [...new Set([...i.liked, id])], disliked: i.disliked.filter(x => x !== id) }) }
export const dislikeMovie = id => { const i = getInteractions(); write('mm_interactions', { liked: i.liked.filter(x => x !== id), disliked: [...new Set([...i.disliked, id])] }) }
