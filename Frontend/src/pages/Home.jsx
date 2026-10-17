import { Link } from 'react-router-dom'
import MovieRow from '../components/MovieRow.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { getPopular, getTopRated, getTrending } from '../services/tmdbService.js'
import { getRecommendedMovies, getSimilarMovies } from '../services/recommendationService.js'
import { useWatchlist } from '../context/WatchlistContext.jsx'
import { getBackdropUrl } from '../utils/images.js'
export default function Home() {
  const { liked, add } = useWatchlist(); const { data } = useAsync(getTrending, []); const h = data?.movies?.[0]
  return (<>
    <section className="hero" style={{ minHeight: '50vh', backgroundImage: h && `url(${getBackdropUrl(h.backdropPath)})` }}><div className="wrap">
      {h && <><h1>{h.title}</h1><p>{h.overview.slice(0, 180)}…</p>
        <div className="row"><Link className="btn" to={`/movie/${h.id}`}>More details</Link><button className="btn ghost" onClick={() => add(h)}>Add to watchlist</button></div></>}</div></section>
    <div className="wrap">
      <MovieRow title="Recommended for you" fetcher={getRecommendedMovies} />
      <MovieRow title="Trending now" fetcher={getTrending} />
      {liked[0] && <MovieRow title="Because you liked a movie" fetcher={() => getSimilarMovies(liked[0])} />}
      <MovieRow title="Popular" fetcher={getPopular} /><MovieRow title="Top rated" fetcher={getTopRated} /></div></>)
}
