import { createContext, useContext, useState } from 'react'
import * as auth from '../services/authService.js'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('mm_user') || 'null'))
  const finish = ({ user, token }) => { localStorage.setItem('mm_user', JSON.stringify(user)); localStorage.setItem('mm_token', token); setUser(user) }
  return <Ctx.Provider value={{ user,
    login: async d => finish(await auth.login(d)), register: async d => finish(await auth.register(d)),
    logout: () => { localStorage.removeItem('mm_user'); localStorage.removeItem('mm_token'); setUser(null) } }}>{children}</Ctx.Provider>
}
