import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import { getTrending } from '../services/tmdbService.js'
import { getBackdropUrl, getPosterUrl } from '../utils/images.js'
export default function Landing() {
  const { data } = useAsync(getTrending, []); const m = data?.movies || []
  return (<>
    <section className="hero" style={{ backgroundImage: m[0] && `url(${getBackdropUrl(m[0].backdropPath)})` }}><div className="wrap">
      <h1>Discover movies made for you.</h1>
      <p>Swipe. Match. Discover. Find your next favorite movie and connect with people who share your taste.</p>
      <div className="row"><Link className="btn" to="/swipe">Start discovering</Link><Link className="btn ghost" to="/discover">Explore movies</Link></div>
    </div></section>
    <div className="wrap"><h2 style={{ marginBottom: 12 }}>Trending this week</h2>
      <div className="scroller">{m.slice(0, 12).map(x => <Link key={x.id} to={`/movie/${x.id}`} className="card"><img src={getPosterUrl(x.posterPath)} alt={x.title} loading="lazy" /></Link>)}</div></div>
  </>)
}
