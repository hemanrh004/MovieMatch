import { useEffect, useState } from 'react'
export function useAsync(fn, deps) {
  const [s, set] = useState({ loading: true, error: null, data: null })
  useEffect(() => { let off = false; set(x => ({ ...x, loading: true, error: null }))
    fn().then(data => !off && set({ loading: false, error: null, data })).catch(error => !off && set({ loading: false, error, data: null }))
    return () => { off = true } }, deps) // eslint-disable-line
  return s
}
export function useDebounce(v, ms = 400) {
  const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t) }, [v, ms]); return d
}
