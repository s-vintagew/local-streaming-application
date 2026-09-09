const fs = require('fs');
const file = 'server/utils/scanner.js';
let content = fs.readFileSync(file, 'utf8');

const oldFetchCall = `        let metadata = await fetchMetadata(searchTitle, type, tmdbId);
        
        // TMDB Fallback Strategy (only run if no tmdbId was explicitly provided)
        if (!metadata.title && !tmdbId) {
          // 1. Try stripping leading collection numbers (e.g., "02 Resident Evil" -> "Resident Evil")
          const strippedTitle = searchTitle.replace(/^\\d{1,3}[\\s._-]+/, '').trim();
          
          if (strippedTitle !== searchTitle) {
            metadata = await fetchMetadata(strippedTitle, type);
          }
          
          // 2. If still no match, try searching the other media type (movie <-> tv)
          if (!metadata.title) {
            const fallbackType = type === 'movie' ? 'tv' : 'movie';
            let fallbackMetadata = await fetchMetadata(searchTitle, fallbackType);
            
            // 3. Try other media type AND stripped title
            if (!fallbackMetadata.title && strippedTitle !== searchTitle) {
              fallbackMetadata = await fetchMetadata(strippedTitle, fallbackType);
            }
            
            if (fallbackMetadata.title) {
              type = fallbackType;
              metadata = fallbackMetadata;
            }
          }
        }`;

const newFetchCall = `        // Smart Year Extraction from fullPath to ensure perfect TMDB matching
        let releaseYear = null;
        // Search the immediate parent directory name first, then the filename
        const yearSearchString = path.basename(dir) + " " + file.name;
        // Look for (YYYY) or .YYYY. or YYYY within the standard movie/show year range
        const yearRegex = /(?:\\b|\\()(19\\d{2}|20\\d{2})(?:\\b|\\))/;
        const yearMatchRegex = yearSearchString.match(yearRegex);
        if (yearMatchRegex) {
            releaseYear = yearMatchRegex[1];
        }

        let metadata = await fetchMetadata(searchTitle, type, tmdbId, releaseYear);
        
        // TMDB Fallback Strategy (only run if no tmdbId was explicitly provided)
        if (!metadata.title && !tmdbId) {
          // 1. Try stripping leading collection numbers (e.g., "02 Resident Evil" -> "Resident Evil")
          const strippedTitle = searchTitle.replace(/^\\d{1,3}[\\s._-]+/, '').trim();
          
          if (strippedTitle !== searchTitle) {
            metadata = await fetchMetadata(strippedTitle, type, null, releaseYear);
          }
          
          // 2. Try falling back WITHOUT the year (sometimes TMDB years are off by 1)
          if (!metadata.title && releaseYear) {
            metadata = await fetchMetadata(searchTitle, type, null, null);
            if (!metadata.title && strippedTitle !== searchTitle) {
                metadata = await fetchMetadata(strippedTitle, type, null, null);
            }
          }
          
          // 3. If still no match, try searching the other media type (movie <-> tv)
          if (!metadata.title) {
            const fallbackType = type === 'movie' ? 'tv' : 'movie';
            let fallbackMetadata = await fetchMetadata(searchTitle, fallbackType, null, releaseYear);
            
            // 4. Try other media type AND stripped title
            if (!fallbackMetadata.title && strippedTitle !== searchTitle) {
              fallbackMetadata = await fetchMetadata(strippedTitle, fallbackType, null, releaseYear);
            }
            
            // 5. Try other media type WITHOUT year
            if (!fallbackMetadata.title && releaseYear) {
               fallbackMetadata = await fetchMetadata(searchTitle, fallbackType, null, null);
            }

            if (fallbackMetadata.title) {
              type = fallbackType;
              metadata = fallbackMetadata;
            }
          }
        }`;

content = content.replace(oldFetchCall, newFetchCall);
fs.writeFileSync(file, content);
