import { createContext, useContext, useState } from 'react'
import * as svc from '../services/watchlistService.js'
const Ctx = createContext(null)
export const useWatchlist = () => useContext(Ctx)
export function WatchlistProvider({ children }) {
  const [list, setList] = useState(svc.getWatchlist)
  const [inter, setInter] = useState(svc.getInteractions)
  const sync = () => { setList(svc.getWatchlist()); setInter(svc.getInteractions()) }
  const act = fn => (...a) => { fn(...a); sync() }
  return <Ctx.Provider value={{ list, liked: inter.liked, disliked: inter.disliked,
    inWatchlist: id => list.some(m => m.id === id),
    add: act(svc.addToWatchlist), remove: act(svc.removeFromWatchlist), setWatched: act(svc.setWatched),
    like: act(m => { svc.likeMovie(m.id); svc.addToWatchlist(m) }), dislike: act(m => svc.dislikeMovie(m.id)) }}>{children}</Ctx.Provider>
}
