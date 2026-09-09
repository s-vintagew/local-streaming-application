import fs from 'fs';
import path from 'path';
import { fetchMetadata } from './metadata.js';

let mediaLibrary = {
  movies: [],
  shows: []
};

const SUPPORTED_EXT = ['.mp4', '.mkv', '.avi', '.webm'];

export const scanMedia = async () => {
  const mediaPath = process.env.MEDIA_PATH || '/media';
  console.log(`Scanning media in ${mediaPath}`);

  try {
    if (!fs.existsSync(mediaPath)) {
      console.warn(`Media path ${mediaPath} does not exist.`);
      return;
    }

    const allFiles = await scanDirectory(mediaPath);
    const newLibrary = { movies: [], shows: [] };
    
    // Group TV shows by title
    const showsMap = {};
    const moviesMap = {};

    for (const file of allFiles) {
      if (file.type === 'tv') {
        if (!showsMap[file.title]) {
          showsMap[file.title] = {
            id: file.id,
            title: file.title,
            type: 'tv',
            posterPath: file.posterPath,
            backdropPath: file.backdropPath,
            overview: file.overview,
            voteAverage: file.voteAverage,
            episodes: []
          };
        }
        // Clean up episode titles for better display (remove [Subs], remove show title if present)
        let cleanEpTitle = file.originalTitle
          .replace(/\[.*?\]/g, '') // Remove [Anime Time], [BD], etc
          .replace(/\(.*?\)/g, '') // Remove (S01+S02) etc
          .replace(new RegExp(file.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '') // Remove the main show title
          .replace(/^[\s._-]+/, '') // Remove leading hyphens/spaces
          .replace(/\b(?:1080p|720p|hevc|x265|aac|dual audio|eng sub)\b/gi, '') // Remove quality tags
          .trim();
          
        if (!cleanEpTitle || cleanEpTitle === '' || cleanEpTitle.match(/^\d+$/)) {
          cleanEpTitle = `Episode ${file.episode}`;
        }

        showsMap[file.title].episodes.push({
          id: file.id,
          season: file.season,
          episode: file.episode,
          path: file.path,
          originalTitle: file.originalTitle,
          title: cleanEpTitle
        });
      } else {
        const uniqueKey = file.tmdbId ? `tmdb-${file.tmdbId}` : file.title;
        if (!moviesMap[uniqueKey]) {
          moviesMap[uniqueKey] = file;
        } else {
          // If we already have a movie with this exact TMDB ID (or title), store the duplicate path as an alternate
          if (!moviesMap[uniqueKey].alternatePaths) {
            moviesMap[uniqueKey].alternatePaths = [];
          }
          moviesMap[uniqueKey].alternatePaths.push(file.path);
        }
      }
    }

    // Sort episodes within shows
    newLibrary.shows = Object.values(showsMap).map(show => {
      show.episodes.sort((a, b) => {
        if (a.season === b.season) return a.episode - b.episode;
        return a.season - b.season;
      });
      return show;
    });
    
    newLibrary.movies = Object.values(moviesMap);

    mediaLibrary = newLibrary;
    console.log(`Scan complete. Found ${mediaLibrary.movies.length} movies and ${mediaLibrary.shows.length} shows.`);
  } catch (err) {
    console.error('Error scanning media:', err);
  }
};

const scanDirectory = async (dir) => {
  const items = [];
  let files = [];
  try {
    files = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    console.warn(`Could not read dir ${dir}`);
    return items;
  }

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      const dirName = file.name.toLowerCase();
      if (['nc', 'extras', 'featurettes', 'trailers', 'deleted scenes'].includes(dirName)) {
        continue; // Skip bonus folders
      }
      const subItems = await scanDirectory(fullPath);
      items.push(...subItems);
    } else {
      const ext = path.extname(file.name).toLowerCase();
      if (SUPPORTED_EXT.includes(ext)) {
        const titleRaw = file.name.replace(ext, '').replace(/\./g, ' ');
        let title = titleRaw;
        let season = 1;
        let episode = 1;
        let type = 'movie';
        
        const tvMatch = titleRaw.match(/(?:^|[\s._-])S(\d{1,2})\s*(?:E|EP)(\d{1,2})(?!\d)/i);
        const seasonMatch = titleRaw.match(/(?:^|[\s._-])(?:S|Season)\s*(\d{1,2})(?!\d)/i);
        
        if (tvMatch || seasonMatch || fullPath.match(/\/(?:shows|tv|season|S\d{1,2})\b/i)) {
           type = 'tv';
           if (tvMatch) {
               season = parseInt(tvMatch[1]);
               episode = parseInt(tvMatch[2]);
               title = titleRaw.substring(0, tvMatch.index).trim();
           } else if (seasonMatch) {
               season = parseInt(seasonMatch[1]);
               const epMatch = titleRaw.match(/(?:E|EP|Episode)\s*(\d{1,2})/i);
               if (epMatch) episode = parseInt(epMatch[1]);
               title = titleRaw.substring(0, seasonMatch.index).trim();
           } else {
               let parentDir = path.basename(dir);
               
               // Try to extract season from the directory name if it exists (e.g. "Season 02")
               const dirSeasonMatch = parentDir.match(/^(?:Season|Series|Book|Volume)\s*(\d+)/i);
               if (dirSeasonMatch) {
                   season = parseInt(dirSeasonMatch[1], 10);
               }
               
               // Try to extract episode from the filename (e.g. "- 02")
               const fileEpMatch = titleRaw.match(/(?:^|[\s._-])(?:-)\s*(\d{2,4})(?!\d)/i);
               if (fileEpMatch) {
                   episode = parseInt(fileEpMatch[1], 10);
               }
               
               // If the parent dir is just "Season X", the real show title is the grandparent dir!
               if (parentDir.match(/^(?:Season|Series|Book|Volume)\s*\d+.*$/i) || parentDir.toLowerCase() === 'specials') {
                   parentDir = path.basename(path.dirname(dir));
               }
               
               if (parentDir.toLowerCase() !== 'shows' && parentDir !== path.basename(process.env.MEDIA_PATH || '/media')) {
                   title = parentDir.replace(/\./g, ' ');
               }
           }
        }

        // Clean up title to remove common release tags and everything after the release year
        let searchTitle = title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');
        const yearMatch = searchTitle.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
            searchTitle = searchTitle.substring(0, yearMatch.index);
        }
        searchTitle = searchTitle.replace(/\b(?:1080p|720p|2160p|4k|8k|x264|x265|hevc|bluray|web-dl|webrip|brrip|hdrip|aac|dts|ddp|ac3|5\.1|7\.1|10bit|hdr|hin|eng|dual audio|esub|psa)\b/gi, ' ');
        searchTitle = searchTitle.replace(/[-_.]/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Permanently strip leading collection numbers (e.g., "02 ") so fallback UI is clean
        searchTitle = searchTitle.replace(/^\d{1,3}\s+/, '').trim();
        
        const tmdbMatch = fullPath.match(/tmdb-(\d+)/i);
        const tmdbId = tmdbMatch ? tmdbMatch[1] : null;

        // Smart Year Extraction from fullPath to ensure perfect TMDB matching
        let releaseYear = null;
        // Search the immediate parent directory name first, then the filename
        const yearSearchString = path.basename(dir) + " " + file.name;
        // Look for (YYYY) or .YYYY. or YYYY within the standard movie/show year range
        const yearRegex = /(?:\b|\()(19\d{2}|20\d{2})(?:\b|\))/;
        const yearMatchRegex = yearSearchString.match(yearRegex);
        if (yearMatchRegex) {
            releaseYear = yearMatchRegex[1];
        }

        let metadata = await fetchMetadata(searchTitle, type, tmdbId, releaseYear);
        
        // TMDB Fallback Strategy (only run if no tmdbId was explicitly provided)
        if (!metadata.title && !tmdbId) {
          // 1. Try stripping leading collection numbers (e.g., "02 Resident Evil" -> "Resident Evil")
          const strippedTitle = searchTitle.replace(/^\d{1,3}[\s._-]+/, '').trim();
          
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
        }
        
        const id = Math.random().toString(36).substring(2, 9);
        items.push({
          id,
          tmdbId: metadata.tmdb_id,
          title: metadata.title || searchTitle || title,
          originalTitle: titleRaw,
          path: fullPath,
          type,
          season,
          episode,
          posterPath: metadata.poster_path || `/api/thumbnail?id=${id}`,
          backdropPath: metadata.backdrop_path,
          overview: metadata.overview,
          voteAverage: metadata.vote_average
        });
      }
    }
  }
  return items;
};

export const getLibrary = () => mediaLibrary;
