# MovieMatch (frontend foundation)
Vite + React + React Router + Framer Motion. Real TMDB data, backend-ready service layer.

## Run
1. `npm install`
2. Copy `.env.example` to `.env` and set `TMDB_READ_TOKEN` (themoviedb.org → Settings → API → *API Read Access Token*).
3. `npm run dev`

The token has no `VITE_` prefix, so only the Vite dev proxy sees it (`vite.config.js`); it is never bundled.

## Architecture
`src/services/*` is the only place that talks to the network or storage. Components never call `fetch`.
- `tmdbService.js` – set `VITE_API_BASE_URL` to your Express route (e.g. `/api/tmdb`) that forwards to TMDB with the token server-side.
- `watchlistService.js`, `authService.js` – localStorage/mock adapters; swap bodies for the `/api/...` endpoints.
- `recommendationService.js`, `aiService.js`, `socketService.js` – interfaces ready for your recommender, LLM backend and Socket.IO.

## Not built yet
Onboarding, search suggestions, friends/profiles/compatibility, chat, discussion rooms, AI assistant UI, password reset.
