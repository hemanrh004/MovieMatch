import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Heart, X, Bookmark } from 'lucide-react'
import { discoverMovies } from '../services/tmdbService.js'
import { getPosterUrl } from '../utils/images.js'
import { useWatchlist } from '../context/WatchlistContext.jsx'
import { ErrorState, Empty } from '../components/States.jsx'
function Card({ movie, onSwipe }) {
  const x = useMotionValue(0), rot = useTransform(x, [-200, 200], [-14, 14])
  const likeO = useTransform(x, [20, 120], [0, 1]), nopeO = useTransform(x, [-120, -20], [1, 0])
  const fly = dir => animate(x, dir * 600, { duration: .25, onComplete: () => onSwipe(dir > 0 ? 'like' : 'dislike') })
  Card.fly = fly
  return (<motion.div className="sw" style={{ x, rotate: rot }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={.9}
    onDragEnd={(_, i) => { if (Math.abs(i.offset.x) > 110) fly(Math.sign(i.offset.x)) }}>
    <img src={getPosterUrl(movie.posterPath, 'w500')} alt={`${movie.title} poster`} draggable={false} />
    <motion.span className="stamp" style={{ opacity: likeO, left: 20, color: '#6ee7a0' }}>LIKE</motion.span>
    <motion.span className="stamp" style={{ opacity: nopeO, right: 20, color: 'var(--rose)' }}>NOPE</motion.span>
    <div className="info"><h3>{movie.title}</h3><small>{movie.year} · ★ {movie.rating.toFixed(1)} · {movie.genres.slice(0, 2).join(', ')} · {movie.language.toUpperCase()}</small><p>{movie.overview}</p></div></motion.div>)
}
export default function Swipe() {
  const { like, dislike, add, liked, disliked } = useWatchlist()
  const [queue, setQueue] = useState([]), [error, setError] = useState(null), [loading, setLoading] = useState(false), seen = useRef(new Set([...liked, ...disliked]))
  const load = async () => { if (loading) return; setLoading(true)
    try { const r = await discoverMovies({ page: 1 + Math.floor(Math.random() * 25) }); setQueue(q => [...q, ...r.movies.filter(m => m.posterPath && !seen.current.has(m.id) && !q.some(x => x.id === m.id))]) }
    catch (e) { setError(e) } finally { setLoading(false) } }
  useEffect(() => { if (queue.length < 5 && !error) load() }, [queue.length]) // eslint-disable-line
  const top = queue[0]
  const handle = kind => { seen.current.add(top.id); kind === 'like' ? like(top) : dislike(top); setQueue(q => q.slice(1)) }
  if (error) return <ErrorState error={error} />
  return (<div className="wrap" style={{ textAlign: 'center' }}><h1>Swipe</h1>
    <div className="stack">{!top && <Empty>Finding movies…</Empty>}
      {queue.slice(0, 2).reverse().map(m => m.id === top.id ? <Card key={m.id} movie={m} onSwipe={handle} /> : <div key={m.id} className="sw" style={{ scale: .94, opacity: .6 }} />)}</div>
    <div className="row" style={{ justifyContent: 'center', gap: 20 }}>
      <button className="round" aria-label="Dislike" disabled={!top} onClick={() => Card.fly(-1)}><X color="var(--rose)" /></button>
      <button className="round" aria-label="Save to watchlist only" disabled={!top} onClick={() => { add(top); handle('dislike') }}><Bookmark color="var(--amber)" /></button>
      <button className="round" aria-label="Like" disabled={!top} onClick={() => Card.fly(1)}><Heart color="#6ee7a0" /></button></div></div>)
}
