import { useAsync } from '../hooks/useAsync.js'
import MovieCard from './MovieCard.jsx'
import { ErrorState } from './States.jsx'
export default function MovieRow({ title, fetcher }) {
  const { loading, error, data } = useAsync(fetcher, [])
  const movies = data?.movies || data || []
  return (<section style={{ marginBottom: 28 }}><h2 style={{ marginBottom: 12 }}>{title}</h2>
    {error ? <ErrorState error={error} /> : <div className="scroller">{loading ? Array.from({ length: 8 }, (_, i) => <div key={i} className="sk" style={{ flex: '0 0 150px' }} />) : movies.map(m => <MovieCard key={m.id} movie={m} />)}</div>}</section>)
}
