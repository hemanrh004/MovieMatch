const axios = require('axios');
const tmdb = require('./tmdbService');
const recommendation = require('./recommendationService');
const { GENRES, LANGUAGES, genreNameToId, canonicalGenre, normalizeLanguage, languageName } = require('../utils/movieHelpers');

// ---------------- Provider abstraction ----------------
// Add a provider by adding an entry with a `complete({ system, prompt, maxTokens })` function.
const providers = {
  anthropic: {
    defaultModel: 'claude-sonnet-5-5',
    async complete({ system, prompt, maxTokens = 700 }) {
      const { data } = await axios.post('https://api.anthropic.com/v1/messages', {
        model: process.env.AI_MODEL || providers.anthropic.defaultModel,
        max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }],
      }, { headers: { 'x-api-key': process.env.AI_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, timeout: 25000 });
      return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    },
  },
  openai: {
    defaultModel: 'gpt-4o-mini',
    async complete({ system, prompt, maxTokens = 700 }) {
      const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: process.env.AI_MODEL || providers.openai.defaultModel, max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      }, { headers: { Authorization: `Bearer ${process.env.AI_API_KEY}` }, timeout: 25000 });
      return data.choices?.[0]?.message?.content || '';
    },
  },
};

const isConfigured = () => Boolean(process.env.AI_API_KEY) && !process.env.AI_API_KEY.startsWith('your_') && Boolean(providers[process.env.AI_PROVIDER || 'anthropic']);
const llm = (args) => providers[process.env.AI_PROVIDER || 'anthropic'].complete(args);

// ---------------- Intent parsing ----------------
const MOODS = [
  [/scary|spooky|creepy|frightening|haunt/, ['Horror', 'Thriller']],
  [/funny|hilarious|laugh|comedy|lighthearted|light-hearted/, ['Comedy']],
  [/romantic|romance|love story|date night/, ['Romance']],
  [/sad|cry|emotional|heartbreaking/, ['Drama']],
  [/rain|cozy|comfort|relax|chill|feel-good|feel good/, ['Drama', 'Romance']],
  [/exciting|adrenaline|explosive|action-packed/, ['Action', 'Adventure']],
  [/mind-bending|psychological|twist|suspense/, ['Thriller', 'Mystery']],
  [/family|kids|children/, ['Family', 'Animation']],
  [/space|futuristic|sci-?fi/, ['Sci-Fi']],
  [/whodunit|detective|investigat/, ['Mystery', 'Crime']],
];
const REGIONAL = { bollywood: 'hi', kollywood: 'ta', tollywood: 'te', mollywood: 'ml', 'k-drama': 'ko', anime: 'ja' };
const DEMONYMS = { korean: 'ko', japanese: 'ja', spanish: 'es', french: 'fr', german: 'de', italian: 'it', chinese: 'zh', indian: 'hi', russian: 'ru', turkish: 'tr', thai: 'th', arabic: 'ar' };

function parseIntentRules(message) {
  const text = message.toLowerCase();
  const genres = new Set();
  MOODS.forEach(([re, gs]) => { if (re.test(text)) gs.forEach((g) => genres.add(g)); });
  Object.values(GENRES).forEach((g) => { if (new RegExp(`\\b${g.toLowerCase().replace('-', '[- ]?')}\\b`).test(text)) genres.add(g); });
  if (/\bsci[- ]?fi\b|science fiction/.test(text)) genres.add('Sci-Fi');

  let language = null;
  for (const [word, code] of Object.entries({ ...REGIONAL, ...DEMONYMS })) if (text.includes(word)) { language = code; break; }
  if (!language) for (const name of Object.values(LANGUAGES)) if (new RegExp(`\\b${name.toLowerCase()}\\b`).test(text)) { language = normalizeLanguage(name); break; }

  const sim = message.match(/(?:similar to|movies? like|films? like|something like|such as|in the style of)\s+["']?([^"',.!?]+?)["']?(?:\s+but\b|\s+with\b|\s+and\b|\s+that\b|[.,!?]|$)/i);
  const rt = text.match(/(?:under|less than|below|within)\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/);
  let maxRuntimeMinutes = null;
  if (rt) maxRuntimeMinutes = Math.round(parseFloat(rt[1]) * (/^h/.test(rt[2]) ? 60 : 1));

  const withoutGenres = [];
  if (/not too violent|less violen|no violence|without violence|non-violent|not violent/.test(text)) withoutGenres.push('War', 'Crime');
  const minRating = /\b(best|top[- ]rated|highly rated|acclaimed|masterpiece)\b/.test(text) ? 7.5 : null;

  return { genres: [...genres].filter((g) => !withoutGenres.includes(g)), language, similarTo: sim ? sim[1].trim() : null, maxRuntimeMinutes, minRating, withoutGenres, mood: null };
}

async function parseIntentWithLLM(message) {
  const system = `You extract movie-search intent. Reply with ONLY a JSON object, no prose, with keys: genres (array, only from: ${Object.values(GENRES).join(', ')}), language (ISO 639-1 code or null), similarTo (a movie title or null), maxRuntimeMinutes (number or null), minRating (number 0-10 or null), withoutGenres (array from the same list), mood (short string or null).`;
  const raw = await llm({ system, prompt: message, maxTokens: 300 });
  const json = raw.match(/\{[\s\S]*\}/);
  if (!json) throw new Error('No JSON in LLM output');
  const p = JSON.parse(json[0]);
  return {
    genres: (Array.isArray(p.genres) ? p.genres : []).map(canonicalGenre).filter(Boolean),
    language: normalizeLanguage(p.language),
    similarTo: typeof p.similarTo === 'string' && p.similarTo.trim() ? p.similarTo.trim() : null,
    maxRuntimeMinutes: Number.isFinite(p.maxRuntimeMinutes) ? p.maxRuntimeMinutes : null,
    minRating: Number.isFinite(p.minRating) ? p.minRating : null,
    withoutGenres: (Array.isArray(p.withoutGenres) ? p.withoutGenres : []).map(canonicalGenre).filter(Boolean),
    mood: typeof p.mood === 'string' ? p.mood : null,
  };
}

async function parseIntent(message) {
  const rules = parseIntentRules(message);
  if (!isConfigured()) return { intent: rules, usedLLM: false };
  try {
    const ai = await parseIntentWithLLM(message);
    return { usedLLM: true, intent: {
      genres: ai.genres.length ? ai.genres : rules.genres,
      language: ai.language || rules.language,
      similarTo: ai.similarTo || rules.similarTo,
      maxRuntimeMinutes: ai.maxRuntimeMinutes ?? rules.maxRuntimeMinutes,
      minRating: ai.minRating ?? rules.minRating,
      withoutGenres: ai.withoutGenres.length ? ai.withoutGenres : rules.withoutGenres,
      mood: ai.mood,
    } };
  } catch (err) {
    console.warn('AI intent parsing failed, using rule-based parser:', err.message);
    return { intent: rules, usedLLM: false };
  }
}

// ---------------- Movie resolution ----------------
const dedupe = (movies) => [...new Map(movies.map((m) => [m.id, m])).values()];

async function findMovies(intent, user, signals) {
  const hasConstraints = intent.genres.length || intent.language || intent.similarTo || intent.maxRuntimeMinutes || intent.minRating;

  if (intent.similarTo) {
    const found = await tmdb.searchMovies(intent.similarTo, 1);
    const base = found.movies[0];
    if (base) {
      const [rec, sim] = await Promise.all([tmdb.getRecommendedMovies(base.id), tmdb.getSimilarMovies(base.id)]);
      let movies = dedupe([...rec.movies, ...sim.movies]).filter((m) => m.id !== base.id && !m.adult && m.posterPath);
      if (signals) movies = movies.filter((m) => !signals.excludeIds.has(m.id));
      if (movies.length) return { movies: movies.slice(0, 8), basedOn: base.title };
    }
  }

  if (!hasConstraints) {
    if (user) {
      const rec = await recommendation.getRecommendations(user._id, { limit: 8 });
      return { movies: rec.movies, basedOn: null };
    }
    const trending = await tmdb.getTrendingMovies(1);
    return { movies: trending.movies.filter((m) => m.posterPath).slice(0, 8), basedOn: null };
  }

  const ids = intent.genres.map(genreNameToId).filter(Boolean);
  const without = intent.withoutGenres.map(genreNameToId).filter(Boolean);
  const base = {
    ...(intent.language ? { with_original_language: intent.language } : {}),
    ...(without.length ? { without_genres: without.join(',') } : {}),
    ...(intent.maxRuntimeMinutes ? { 'with_runtime.lte': intent.maxRuntimeMinutes } : {}),
    ...(intent.minRating ? { 'vote_average.gte': intent.minRating, 'vote_count.gte': 300 } : {}),
  };
  let result = await tmdb.discoverMovies({ ...base, ...(ids.length ? { with_genres: ids.join(',') } : {}) }); // AND
  if (result.movies.length < 5 && ids.length > 1) result = await tmdb.discoverMovies({ ...base, with_genres: ids.join('|') }); // relax to OR
  let movies = result.movies.filter((m) => !m.adult && m.posterPath);
  if (signals) movies = recommendation.rankMovies(movies, signals); // personalize ordering + drop already-seen
  return { movies: movies.slice(0, 8), basedOn: null };
}

// ---------------- Reply generation ----------------
function templateReply(message, intent, movies, basedOn) {
  if (!movies.length) return "I couldn't find matches for that. Try loosening a filter, like a different genre or a longer runtime.";
  const bits = [];
  if (basedOn) bits.push(`similar to ${basedOn}`);
  if (intent.genres.length) bits.push(intent.genres.join('/').toLowerCase());
  if (intent.language) bits.push(`${languageName(intent.language)}-language`);
  if (intent.maxRuntimeMinutes) bits.push(`under ${intent.maxRuntimeMinutes} minutes`);
  const desc = bits.length ? bits.join(', ') : 'picks';
  const top = movies.slice(0, 3).map((m) => `${m.title}${m.year ? ` (${m.year})` : ''}`).join(', ');
  return `Here are ${movies.length} ${desc} to try. Top of the list: ${top}. Tap any card for details or add one to your watchlist.`;
}

async function writeReply(message, intent, movies, basedOn) {
  if (!isConfigured() || !movies.length) return { reply: templateReply(message, intent, movies, basedOn), usedLLM: false };
  try {
    const list = movies.slice(0, 6).map((m) => `- ${m.title} (${m.year}), rated ${m.rating.toFixed(1)}, ${m.genres.join('/')}: ${m.overview.slice(0, 140)}`).join('\n');
    const reply = await llm({
      system: 'You are MovieMatch AI, a friendly movie expert. Recommend ONLY movies from the provided list. Write 2-4 short sentences, mention why the top picks fit the request, no markdown, no invented movies.',
      prompt: `User request: "${message}"\n${basedOn ? `Based on: ${basedOn}\n` : ''}Candidate movies:\n${list}`,
      maxTokens: 350,
    });
    return { reply: reply.trim() || templateReply(message, intent, movies, basedOn), usedLLM: true };
  } catch (err) {
    console.warn('AI reply generation failed, using template:', err.message);
    return { reply: templateReply(message, intent, movies, basedOn), usedLLM: false };
  }
}

async function recommendFromMessage(message, user) {
  const { intent, usedLLM: llmIntent } = await parseIntent(message);
  const signals = user ? await recommendation.buildSignals(user._id) : null;
  const { movies, basedOn } = await findMovies(intent, user, signals);
  const { reply, usedLLM: llmReply } = await writeReply(message, intent, movies, basedOn);
  return {
    message: reply,
    movies,
    intent,
    aiConfigured: isConfigured(),
    note: isConfigured() ? undefined : 'AI_API_KEY is not set, so keyword-based understanding was used. Results still come from TMDB.',
    usedLLM: llmIntent || llmReply,
  };
}

module.exports = { recommendFromMessage, isConfigured, parseIntentRules };
