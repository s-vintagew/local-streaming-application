import axios from 'axios';

const TMDB_URL = 'https://api.themoviedb.org/3';

// Simple in-memory cache
const cache = new Map();

export const fetchMetadata = async (query, type = 'movie', tmdbId = null) => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || apiKey === 'your_tmdb_api_key_here') {
    console.warn('TMDB_API_KEY not set or invalid, skipping metadata fetch.');
    return {};
  }

  const cacheKey = tmdbId ? `tmdb:${type}:${tmdbId}` : `${type}:${query}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Prevent TMDB Rate Limiting (40 requests per 10 seconds)
  await new Promise(resolve => setTimeout(resolve, 250));

  try {
    const searchType = type === 'tv' ? 'tv' : 'movie';
    let result = null;

    if (tmdbId) {
      const response = await axios.get(`${TMDB_URL}/${searchType}/${tmdbId}`, {
        params: { api_key: apiKey }
      });
      result = response.data;
    } else {
      const response = await axios.get(`${TMDB_URL}/search/${searchType}`, {
        params: { api_key: apiKey, query: query }
      });
      if (response.data.results && response.data.results.length > 0) {
        result = response.data.results[0];
      }
    }

    if (result && (result.title || result.name)) {
      const data = {
        tmdb_id: result.id,
        title: result.title || result.name,
        poster_path: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null,
        backdrop_path: result.backdrop_path ? `https://image.tmdb.org/t/p/w1280${result.backdrop_path}` : null,
        overview: result.overview,
        vote_average: result.vote_average,
        release_date: result.release_date || result.first_air_date
      };
      cache.set(cacheKey, data);
      return data;
    }
  } catch (err) {
    console.error(`Failed to fetch metadata for ${tmdbId || query}:`, err.message);
  }

  return {};
};

