import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { getPosterUrl } from '../utils/images.js'
import { useWatchlist } from '../context/WatchlistContext.jsx'
export default memo(function MovieCard({ movie }) {
  const { inWatchlist, add, remove } = useWatchlist(); const saved = inWatchlist(movie.id)
  return (<div className="card">
    <Link to={`/movie/${movie.id}`}>
      {movie.posterPath ? <img src={getPosterUrl(movie.posterPath)} alt={`${movie.title} poster`} loading="lazy" /> : <div className="ph" />}
      <span className="badge">★ {movie.rating?.toFixed(1)}</span>
      <div className="meta"><b>{movie.title}</b><br /><span>{movie.year}</span></div></Link>
    <button className="round" style={{ position: 'absolute', top: 6, right: 6, width: 34, height: 34 }} aria-pressed={saved}
      aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'} onClick={() => saved ? remove(movie.id) : add(movie)}>
      <Bookmark size={16} fill={saved ? 'var(--amber)' : 'none'} /></button></div>)
})
