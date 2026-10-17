import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWatchlist } from '../context/WatchlistContext.jsx'
import { getPosterUrl } from '../utils/images.js'
import { Empty } from '../components/States.jsx'
export default function Watchlist() {
  const { list, remove, setWatched } = useWatchlist(); const [tab, setTab] = useState('all'), [sort, setSort] = useState('added')
  const shown = list.filter(m => tab === 'all' || (tab === 'watched') === m.watched).sort((a, b) => sort === 'rating' ? b.rating - a.rating : sort === 'title' ? a.title.localeCompare(b.title) : b.addedAt - a.addedAt)
  return (<div className="wrap"><h1 style={{ marginBottom: 14 }}>Watchlist</h1>
    <div className="row">{[['all', 'All'], ['want', 'Want to watch'], ['watched', 'Watched']].map(([k, l]) => <button key={k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
      <select className="input" style={{ width: 'auto', marginLeft: 'auto' }} aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}><option value="added">Recently added</option><option value="rating">Rating</option><option value="title">Title</option></select></div>
    {!shown.length ? <Empty>Your watchlist is empty. Swipe right on a movie or save one from Discover.</Empty> :
      <div style={{ display: 'grid', gap: 12, marginTop: 20 }}>{shown.map(m => <div key={m.id} className="row" style={{ background: 'var(--panel)', borderRadius: 12, padding: 10 }}>
        <img src={getPosterUrl(m.posterPath, 'w154')} alt={`${m.title} poster`} style={{ width: 60, borderRadius: 8 }} loading="lazy" />
        <div style={{ flex: 1 }}><Link to={`/movie/${m.id}`}><b>{m.title}</b></Link><br /><small style={{ color: 'var(--mute)' }}>{m.year} · ★ {m.rating.toFixed(1)} · {m.genres.slice(0, 2).join(', ')}</small></div>
        <button className="btn ghost" onClick={() => setWatched(m.id, !m.watched)}>{m.watched ? 'Mark unwatched' : 'Mark watched'}</button>
        <button className="btn ghost" onClick={() => remove(m.id)}>Remove</button></div>)}</div>}</div>)
}
