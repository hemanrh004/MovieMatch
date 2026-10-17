import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import { Loading } from './components/States.jsx'
const Landing = lazy(() => import('./pages/Landing.jsx'))
const Auth = lazy(() => import('./pages/Auth.jsx'))
const Home = lazy(() => import('./pages/Home.jsx'))
const Discover = lazy(() => import('./pages/Discover.jsx'))
const Swipe = lazy(() => import('./pages/Swipe.jsx'))
const MovieDetails = lazy(() => import('./pages/MovieDetails.jsx'))
const Watchlist = lazy(() => import('./pages/Watchlist.jsx'))
export default function App() {
  return (<>
    <Navbar />
    <main id="main"><Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/home" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/swipe" element={<Swipe />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="*" element={<p className="state">Page not found.</p>} />
      </Routes></Suspense></main>
  </>)
}
