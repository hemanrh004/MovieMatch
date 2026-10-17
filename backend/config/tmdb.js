const axios = require('axios');

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

// One reusable client. The bearer token is read per request and never leaves the server.
const tmdbClient = axios.create({ baseURL: TMDB_BASE_URL, timeout: 10000, headers: { Accept: 'application/json' } });
tmdbClient.interceptors.request.use((cfg) => {
  cfg.headers.Authorization = `Bearer ${process.env.TMDB_ACCESS_TOKEN}`;
  return cfg;
});

module.exports = { tmdbClient, IMAGE_BASE_URL };
