import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// Dev-only proxy: the TMDB token lives in .env WITHOUT the VITE_ prefix,
// so it is used by the dev server and never bundled into browser code.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: { proxy: { '/tmdb': {
      target: 'https://api.themoviedb.org/3', changeOrigin: true,
      rewrite: p => p.replace(/^\/tmdb/, ''),
      headers: { Authorization: `Bearer ${env.TMDB_READ_TOKEN}` } } } }
  }
})
