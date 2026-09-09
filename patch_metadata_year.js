const fs = require('fs');
const file = 'server/utils/metadata.js';
let content = fs.readFileSync(file, 'utf8');

const oldFuncStart = `export const fetchMetadata = async (query, type = 'movie', tmdbId = null) => {`;
const newFuncStart = `export const fetchMetadata = async (query, type = 'movie', tmdbId = null, year = null) => {`;

const oldParams = `    if (tmdbId) {
      const response = await axios.get(\`\${TMDB_URL}/\${searchType}/\${tmdbId}\`, {
        params: { api_key: apiKey }
      });
      result = response.data;
    } else {
      const response = await axios.get(\`\${TMDB_URL}/search/\${searchType}\`, {
        params: { api_key: apiKey, query: query }
      });
      if (response.data.results && response.data.results.length > 0) {
        result = response.data.results[0];
      }
    }`;

const newParams = `    if (tmdbId) {
      const response = await axios.get(\`\${TMDB_URL}/\${searchType}/\${tmdbId}\`, {
        params: { api_key: apiKey }
      });
      result = response.data;
    } else {
      const params = { api_key: apiKey, query: query };
      if (year) {
        if (searchType === 'movie') params.primary_release_year = year;
        else params.first_air_date_year = year;
      }
      const response = await axios.get(\`\${TMDB_URL}/search/\${searchType}\`, { params });
      if (response.data.results && response.data.results.length > 0) {
        result = response.data.results[0];
      }
    }`;

content = content.replace(oldFuncStart, newFuncStart);
content = content.replace(oldParams, newParams);

fs.writeFileSync(file, content);
