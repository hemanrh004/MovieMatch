# MovieMatch Backend

REST API + Socket.IO server for **MovieMatch: AI-powered movie recommendation and social platform**.
Node.js · Express · MongoDB (Mongoose) · JWT · TMDB · Socket.IO.

## 1. Features
Auth (JWT + bcrypt) · profiles and preferences · TMDB movie data (trending, search, details, credits, videos, similar) · watchlist · swipe like/dislike with auto-watchlist and undo · content-based recommendations with explanations (plus a similar-users signal) · taste compatibility · friends and suggestions · real-time chat with typing, presence and read receipts · movie discussion rooms · notifications · AI assistant (natural language, mood, "movies like X") with a no-key fallback.

## 2. Folder structure
```
backend/
├── config/        db.js, tmdb.js
├── controllers/   auth, user, movie, watchlist, swipe, friend, message, notification, recommendation, discussion, ai
├── middleware/    auth, error, validation (+sanitizer), rateLimit
├── models/        User, Swipe, Watchlist, Friend, Message, Conversation, Notification, DiscussionMessage
├── routes/        one file per resource
├── services/      tmdbService, recommendationService, compatibilityService, aiService
├── socket/        socketHandler, chatHandler, presence
├── utils/         generateToken, pagination, movieHelpers, AppError, asyncHandler, apiResponse
├── validators/    auth, user, movie, social
├── postman/       MovieMatch.postman_collection.json
├── .env.example  .gitignore  package.json  server.js
```

## 3. Setup
```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# edit .env (see below)
npm run dev               # development (nodemon)
npm start                 # production
```
Server: http://localhost:5000 · health check: `GET /api/health`.

### MongoDB
- **Local:** install MongoDB Community Server, start the service, keep `MONGO_URI=mongodb://127.0.0.1:27017/moviematch`. Collections and indexes are created automatically on first use.
- **Atlas (cloud):** create a free cluster, add a database user, allow your IP under Network Access, then copy the connection string into `MONGO_URI` (e.g. `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/moviematch`).

### TMDB
1. Create a free account at themoviedb.org → Settings → API → request a developer key.
2. Copy the **API Read Access Token** (the long one starting with `eyJ`), not the short API key.
3. Put it in `.env` as `TMDB_ACCESS_TOKEN`. It stays on the server and is never sent to the browser.

### Environment variables
| Variable | Purpose |
|---|---|
| PORT | Server port (5000) |
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | Long random string. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| JWT_EXPIRES_IN | Token lifetime (7d) |
| FRONTEND_URL | Allowed CORS origin(s), comma-separated (http://localhost:5173) |
| TMDB_ACCESS_TOKEN | TMDB read token |
| AI_API_KEY | Optional. Without it the AI endpoint uses keyword parsing and templated replies |
| AI_PROVIDER / AI_MODEL | Optional. `anthropic` (default) or `openai`; model overrides the provider default |
| NODE_ENV | development / production |

## 4. Conventions
Success: `{ "success": true, "message": "...", "data": {...} }`
Error: `{ "success": false, "message": "...", "error": {...} }`
Auth: send `Authorization: Bearer <token>`. Status codes used: 200, 201, 400, 401, 403, 404, 409, 429, 500 (plus 413, 502 and 503 for oversized bodies and upstream TMDB problems).
Pagination: `?page=1&limit=20`. TMDB-backed movie lists are fixed at 20 per page, so only `page` applies there. Movie objects match the React frontend shape (`id, title, posterPath, posterUrl, backdropUrl, year, rating, genres, genreIds, language, ...`).
Genres are stored by name (e.g. "Sci-Fi"); languages are stored as ISO codes. You may send either `"Korean"` or `"ko"`.

## 5. API reference
"Auth" = Bearer token required. All bodies are JSON.

### Auth
| Method | URL | Auth | Body | Response `data` |
|---|---|---|---|---|
| POST | /api/auth/register | No | `name, email, password` (8+ chars, letter and number) | `{ token, user }` (201) |
| POST | /api/auth/login | No | `email, password` | `{ token, user }` |
| GET | /api/auth/me | Yes | | `{ user }` |
| POST | /api/auth/logout | Yes | | `{}` (client discards token) |

### Users
| Method | URL | Auth | Body / query | Response `data` |
|---|---|---|---|---|
| GET | /api/users/profile | Yes | | `{ user, stats }` |
| PUT | /api/users/profile | Yes | any of `name, bio, avatar, genres[], languages[], favoriteMovies[]` | `{ user }` |
| PUT | /api/users/preferences | Yes | `genres[]` (required), `languages[]`, `favoriteMovies[]` (TMDB ids) | `{ user }` (sets onboardingCompleted) |
| GET | /api/users/:id | Yes | | `{ user, stats, friendship }` |
| GET | /api/users/:id/compatibility | Yes | | `{ user, score, commonGenres, commonLanguages, commonMovies, breakdown }` |

### Movies (public unless noted; all TMDB-backed)
| Method | URL | Query | Response `data` |
|---|---|---|---|
| GET | /api/movies/trending, /popular, /top-rated, /now-playing, /upcoming | `page` | `{ movies, page, totalPages, totalResults }` |
| GET | /api/movies/search | `query` (required), `page` | same |
| GET | /api/movies/genre/:genreId | `page` | same |
| GET | /api/movies/language/:code | `page` | same |
| GET | /api/movies/genres, /api/movies/languages | | `{ genres }` / `{ languages }` (for onboarding UI) |
| GET | /api/movies/:movieId | | movie with `director, cast, trailerKey, companies, tagline` |
| GET | /api/movies/:movieId/similar, /recommendations | `page` | movie list |
| GET | /api/movies/:movieId/credits | | `{ cast, director, crew }` |
| GET | /api/movies/:movieId/videos | | `{ videos }` |
| GET | /api/movies/:movieId/discussion | `page, limit` (Auth) | `{ movie, room, participantCount, messages, pagination }` |
| POST | /api/movies/:movieId/discussion | Body `text, parent?` (Auth) | message (201) |
| POST | /api/movies/:movieId/discussion/:messageId/like | (Auth) | `{ liked, likeCount }` |

### Watchlist (Auth)
| Method | URL | Body / query | Response `data` |
|---|---|---|---|
| POST | /api/watchlist | `{ movieId }` | `{ movieId }` (201, 409 if duplicate) |
| GET | /api/watchlist | `page, limit` | `{ movies (with addedAt), pagination }` |
| DELETE | /api/watchlist/:movieId | | `{ movieId }` |
| GET | /api/watchlist/check/:movieId | | `{ inWatchlist }` |

### Swipes (Auth)
| Method | URL | Body / query | Notes |
|---|---|---|---|
| POST | /api/swipes | `{ movieId, action: "like"\|"dislike" }` | like adds to watchlist; changing your mind updates the single record |
| GET | /api/swipes/history, /liked, /disliked | `page, limit` | `{ swipes: [{ movieId, action, swipedAt, movie }], pagination }` |
| POST | /api/swipes/undo | | undoes the most recent swipe (and its auto watchlist entry) |

### Recommendations (Auth)
`GET /api/recommendations?page=1&limit=20` → `{ movies: [{...movie, score, reasons[]}], reason, page }`
Scoring: preferred genre/language match, learned genre affinity from likes vs dislikes, "because you liked X" (TMDB recommendations), and movies liked by users with overlapping likes. Seen movies (liked, disliked, watchlisted) are excluded.

### Friends (Auth)
| Method | URL | Notes |
|---|---|---|
| POST | /api/friends/request/:userId | 201; 409 duplicate; 400 self |
| POST | /api/friends/accept/:userId, /reject/:userId | recipient only |
| DELETE | /api/friends/:userId | unfriend, or cancel a request you sent |
| GET | /api/friends | `{ friends: [{ id, name, avatar, isOnline, ... }] }` |
| GET | /api/friends/requests | `{ incoming, sent }` |
| GET | /api/friends/suggestions | `{ suggestions: [{ user, compatibility }] }` sorted by score |

### Messages (Auth). Messaging requires an accepted friendship.
| Method | URL | Body / query | Response `data` |
|---|---|---|---|
| GET | /api/messages/conversations | | `{ conversations: [{ id, participant, lastMessage, unreadCount }] }` |
| GET | /api/messages/:conversationId | `page, limit` | `{ messages (oldest first), pagination }`; page 1 = newest |
| POST | /api/messages | `{ receiverId, text }` | `{ message, conversationId }` (201) |
| PUT | /api/messages/:messageId/read | | recipient only |
| DELETE | /api/messages/:messageId | | sender only |

### Notifications (Auth)
`GET /api/notifications?page&limit` → `{ notifications, unreadCount, pagination }` · `PUT /api/notifications/:id/read` · `PUT /api/notifications/read-all` · `DELETE /api/notifications/:id`
Types: `friend_request, friend_accepted, new_message, movie_discussion, recommendation`.

### AI
`POST /api/ai/recommend` (token optional; a token personalizes results) body `{ "message": "scary Korean movie, not too violent" }`
→ `{ message, movies, intent, aiConfigured, usedLLM, note? }`. Without `AI_API_KEY` a rule-based parser handles genre, language, mood, "like X", runtime ("under 2 hours") and "not too violent". Results are always real TMDB movies. To add a provider, add an entry to `providers` in `services/aiService.js`.

## 6. Socket.IO
Connect to `http://localhost:5000` with `auth: { token }` (the JWT). Each user joins room `user:<id>` automatically.

| Direction | Event | Payload | Notes |
|---|---|---|---|
| client→server | joinConversation | `{ conversationId }` + ack | must be a participant |
| client→server | leaveConversation | `{ conversationId }` | |
| client→server | sendMessage | `{ receiverId, text, tempId? }` + ack `{ success, message, tempId }` | saved to MongoDB |
| client→server | typing / stopTyping | `{ conversationId }` | sender must have joined the conversation |
| client→server | messageRead | `{ messageId }` or `{ conversationId }` + ack | |
| client→server | joinMovieRoom / leaveMovieRoom | `{ movieId }` | discussion rooms |
| server→client | receiveMessage | message | new DM |
| server→client | messageDelivered / messageRead / messageDeleted | ids | receipts |
| server→client | typing / stopTyping | `{ conversationId, userId }` | |
| server→client | userOnline / userOffline | `{ userId, lastSeen? }` | sent to friends |
| server→client | onlineFriends | `[userId]` | on connect |
| server→client | notification | notification doc | live push |
| server→client | discussionMessage / discussionLike | message / `{ messageId, likeCount }` | after joining `movie:<id>` |

## 7. Connecting the React frontend
```js
// src/services/api.js
import axios from 'axios'
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api' })
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('mm_token'); if (t) cfg.headers.Authorization = `Bearer ${t}`; return cfg })
export default api

// login
const { data } = await api.post('/auth/login', { email, password })
localStorage.setItem('mm_token', data.data.token)

// movies / swipe
const trending = (await api.get('/movies/trending', { params: { page: 1 } })).data.data.movies
await api.post('/swipes', { movieId: 603, action: 'like' })
```
```js
// src/services/socketService.js
import { io } from 'socket.io-client'   // npm i socket.io-client
let socket
export const connectSocket = token => { socket = io('http://localhost:5000', { auth: { token } }); return socket }
export const sendMessage = (receiverId, text) => new Promise(r => socket.emit('sendMessage', { receiverId, text }, r))
export const receiveMessage = cb => socket.on('receiveMessage', cb)
export const typingStart = conversationId => socket.emit('typing', { conversationId })
export const typingStop = conversationId => socket.emit('stopTyping', { conversationId })
export const markMessageRead = messageId => socket.emit('messageRead', { messageId })
```
In the frontend `.env`: `VITE_API_BASE_URL=http://localhost:5000/api`. The earlier frontend's `tmdbService.js` can point at this API; the movie shape is the same.

## 8. Git / GitHub
```bash
git init && git add . && git commit -m "MovieMatch backend"
git branch -M main
git remote add origin https://github.com/<you>/moviematch-backend.git
git push -u origin main
```
`.env` is git-ignored. Never commit it. If a secret leaks, rotate it.

## 9. Troubleshooting
| Problem | Fix |
|---|---|
| `MongoDB connection failed` | Start MongoDB, or check `MONGO_URI`/Atlas IP allow-list |
| Movie routes return 503 "TMDB is not configured" | Set `TMDB_ACCESS_TOKEN` (the long read token) and restart |
| 502 "TMDB authentication failed" | Wrong token; use the API Read Access Token |
| CORS error in browser | `FRONTEND_URL` must exactly match your frontend origin (port included) |
| 401 on every request | Missing `Authorization: Bearer <token>` header or expired token |
| Socket "Authentication required" | Pass `auth: { token }` when connecting |
| `EADDRINUSE` | Change `PORT` or stop the other process |
| 409 on swipe/watchlist | Already recorded; expected behavior |
| 429 | Rate limit; wait or raise `RATE_LIMIT_MAX` |

## 10. Future improvements
Redis cache (replace `cacheGet/cacheSet` in `tmdbService`), refresh tokens and a logout blocklist, email password reset, true collaborative filtering (swap the scoring stage in `recommendationService`), block/report users, image upload for avatars, automated tests.
