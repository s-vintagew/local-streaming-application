# VintageStream

A powerful, self-hosted streaming application designed to organize and stream your personal media library. Built with a React frontend and an Express/Node.js backend.

## Features

- **Automated Media Scanning:** Intelligently scans your local file server and organizes your media into Movies and TV Shows.
- **Smart Anime & TV Parsing:** Extracts complex episode numbers, parses heavily nested anime directories, and collapses seasons into unified TV shows.
- **TMDB Integration:** Automatically fetches high-quality metadata, backdrops, posters, and overviews for your library.
- **Native Video Streaming:** Supports native HTTP partial-content streaming with built-in chunking for fast, buffer-free playback.
- **Hardware Transcoding:** Built-in FFmpeg fallback for resolution scaling and format handling.
- **Direct Server Downloads:** Forcefully download complete movie and episode files directly from your server at maximum speed.
- **Dynamic Configuration:** Entire stack is controlled from a single `.env` file.

## Prerequisites

- **Node.js** (v16+)
- **FFmpeg** (Must be installed on your system path for transcoding to function)

## Getting Started

### 1. Configuration
Create a `.env` file in the root directory and configure your environment:
```env
TMDB_API_KEY=your_tmdb_api_key
MEDIA_PATH=/absolute/path/to/your/media
PORT=6000
FRONTEND_PORT=5173
```

### 2. Backend Setup
```bash
cd server
npm install
npm start
```
The backend will automatically start scanning your `MEDIA_PATH`.

### 3. Frontend Setup
In a new terminal window:
```bash
cd client
npm install
npm run dev
```
The frontend will boot up and automatically proxy API requests to your backend port.

## Media Folder Structure Best Practices

To get the best matches from TMDB, standard naming conventions are recommended, but the scanner is designed to be highly resilient against scene tags, release groups, and complex anime folder nesting. 

- **Movies:** `Movie Title (Year).mkv`
- **TV Shows:** `Show Title/Season 01/Show Title S01E01.mkv`

### Exact TMDB Matching
If the scanner guesses a movie incorrectly, you can force an exact match by including the TMDB ID anywhere in the file or folder name:
```
Movie Title [tmdb-12345].mkv
```

## License
MIT License
