import { NavLink, Link } from 'react-router-dom'
import { Home, Compass, Flame, Bookmark, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
const items = [['/home', 'Home', Home], ['/discover', 'Discover', Compass], ['/swipe', 'Swipe', Flame], ['/watchlist', 'Watchlist', Bookmark]]
export default function Navbar() {
  const { user, logout } = useAuth(); const cls = ({ isActive }) => isActive ? 'on' : ''
  return (<>
    <header className="nav"><div className="wrap">
      <Link to="/" className="logo">Movie<b>Match</b></Link>
      <nav className="links" aria-label="Main">{items.map(([to, l]) => <NavLink key={to} to={to} className={cls}>{l}</NavLink>)}</nav>
      {user ? <button className="btn ghost" onClick={logout}>Log out</button> : <Link className="btn" to="/login">Log in</Link>}
    </div></header>
    <nav className="bottom" aria-label="Mobile">{items.map(([to, l, I]) => <NavLink key={to} to={to} className={cls}><I size={22} />{l}</NavLink>)}
      <NavLink to={user ? '/watchlist' : '/login'} className={cls}><User size={22} />Profile</NavLink></nav>
  </>)
}
