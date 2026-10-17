import { useEffect, useState } from 'react'
import MovieCard from '../components/MovieCard.jsx'
import { SkeletonGrid, ErrorState, Empty } from '../components/States.jsx'
import { discoverMovies, searchMovies, GENRES } from '../services/tmdbService.js'
import { useDebounce } from '../hooks/useAsync.js'
export default function Discover() {
  const [q, setQ] = useState(''), [genre, setGenre] = useState(''), [sort, setSort] = useState('popularity.desc'), [minRating, setMin] = useState('')
  const [movies, setMovies] = useState([]), [page, setPage] = useState(1), [total, setTotal] = useState(1), [loading, setLoading] = useState(true), [error, setError] = useState(null)
  const dq = useDebounce(q)
  useEffect(() => { setMovies([]); setPage(1) }, [dq, genre, sort, minRating])
  useEffect(() => { let off = false; setLoading(true); setError(null)
    ;(dq ? searchMovies(dq, page) : discoverMovies({ page, genre, sort, minRating })).then(r => { if (off) return; setMovies(p => page === 1 ? r.movies : [...p, ...r.movies]); setTotal(r.totalPages) })
      .catch(e => !off && setError(e)).finally(() => !off && setLoading(false)); return () => { off = true } }, [dq, genre, sort, minRating, page])
  return (<div className="wrap"><h1 style={{ marginBottom: 16 }}>Discover</h1>
    <input className="input" type="search" placeholder="Search movies" aria-label="Search movies" value={q} onChange={e => setQ(e.target.value)} />
    <div className="row" style={{ margin: '14px 0' }}>
      <button className={`chip ${!genre ? 'on' : ''}`} onClick={() => setGenre('')}>All</button>
      {Object.entries(GENRES).map(([id, n]) => <button key={id} className={`chip ${genre === id ? 'on' : ''}`} aria-pressed={genre === id} onClick={() => setGenre(id)}>{n}</button>)}</div>
    <div className="row" style={{ marginBottom: 20 }}>
      <select className="input" style={{ width: 'auto' }} aria-label="Sort" value={sort} onChange={e => setSort(e.target.value)}>
        <option value="popularity.desc">Popular</option><option value="vote_average.desc">Top rated</option><option value="primary_release_date.desc">Latest</option></select>
      <select className="input" style={{ width: 'auto' }} aria-label="Minimum rating" value={minRating} onChange={e => setMin(e.target.value)}>
        <option value="">Any rating</option><option value="6">6+</option><option value="7">7+</option><option value="8">8+</option></select></div>
    {error ? <ErrorState error={error} /> : <>
      {movies.length > 0 && <div className="grid">{movies.map(m => <MovieCard key={m.id} movie={m} />)}</div>}
      {loading && <SkeletonGrid n={movies.length ? 6 : 12} />}
      {!loading && !movies.length && <Empty>No movies found. Try a different search or filter.</Empty>}
      {!loading && page < total && <div className="row" style={{ justifyContent: 'center', marginTop: 24 }}><button className="btn ghost" onClick={() => setPage(p => p + 1)}>Load more</button></div>}</>}</div>)
}
