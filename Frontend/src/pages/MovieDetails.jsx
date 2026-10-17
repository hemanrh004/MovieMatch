import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import { getMovieDetails } from '../services/tmdbService.js'
import { getBackdropUrl, getPosterUrl } from '../utils/images.js'
import { useWatchlist } from '../context/WatchlistContext.jsx'
import MovieCard from '../components/MovieCard.jsx'
import { Loading, ErrorState } from '../components/States.jsx'
export default function MovieDetails() {
  const { id } = useParams(); const { loading, error, data: m } = useAsync(() => getMovieDetails(id), [id])
  const { like, inWatchlist, add, remove } = useWatchlist(); const [trailer, setTrailer] = useState(false)
  if (loading) return <Loading />; if (error) return <ErrorState error={error} />
  const saved = inWatchlist(m.id)
  return (<><section className="hero" style={{ backgroundImage: `url(${getBackdropUrl(m.backdropPath)})` }}><div className="wrap row" style={{ alignItems: 'flex-end', gap: 24 }}>
    <img src={getPosterUrl(m.posterPath, 'w342')} alt={`${m.title} poster`} style={{ width: 180, borderRadius: 12 }} />
    <div style={{ flex: 1, minWidth: 260 }}><h1 style={{ fontSize: 'clamp(2rem,5vw,3.4rem)' }}>{m.title}</h1>
      <p style={{ margin: '8px 0' }}>{m.tagline}</p>
      <p style={{ color: 'var(--mute)' }}>★ {m.rating.toFixed(1)} ({m.voteCount.toLocaleString()} votes) · {m.year} · {m.runtime} min · {m.genres.join(', ')}</p>
      <div className="row" style={{ marginTop: 14 }}><button className="btn" onClick={() => like(m)}>Like</button>
        <button className="btn ghost" onClick={() => saved ? remove(m.id) : add(m)}>{saved ? 'Remove from watchlist' : 'Add to watchlist'}</button>
        {m.trailerKey && <button className="btn ghost" onClick={() => setTrailer(t => !t)}>{trailer ? 'Hide trailer' : 'Watch trailer'}</button>}</div></div></div></section>
    <div className="wrap"><p style={{ maxWidth: '65ch' }}>{m.overview}</p>
      <p style={{ margin: '14px 0', color: 'var(--mute)' }}>Director: {m.director || 'Unknown'} · Studios: {m.companies.join(', ')}</p>
      {trailer && <iframe title={`${m.title} trailer`} width="100%" style={{ aspectRatio: '16/9', border: 0, borderRadius: 12 }} src={`https://www.youtube-nocookie.com/embed/${m.trailerKey}`} allowFullScreen />}
      <h2 style={{ margin: '24px 0 10px' }}>Cast</h2><div className="row">{m.cast.map(c => <span key={c.id} className="chip">{c.name} <small>as {c.character}</small></span>)}</div>
      <h2 style={{ margin: '24px 0 10px' }}>Similar movies</h2><div className="scroller">{m.similar.map(s => <MovieCard key={s.id} movie={s} />)}</div></div></>)
}
