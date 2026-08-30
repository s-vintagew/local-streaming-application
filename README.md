# VintageStream (v2.0)

A powerful, self-hosted streaming application designed to organize and stream your personal media library to any device. Built with a React frontend and an Express/Node.js backend.

## 🚀 v2.0 Features & Upgrades

- **Mobile-First Custom Player:** A stunning, fully responsive Netflix-style HTML5 video player built from scratch.
  - **YouTube-Style Touch Gestures:** Invisible mobile touch zones. Double-tap left/right to skip 10 seconds, double-tap center to toggle play, single tap to toggle UI.
  - **Desktop Keyboard Shortcuts:** \`Space\` (Play/Pause), \`Left/Right Arrows\` (Seek ±10s), \`F\` (Toggle Fullscreen).
  - **Smart Orientation Lock:** Automatically forces landscape mode on mobile devices when entering fullscreen.
- **Advanced FFmpeg Transcoding Engine:** Completely overhauled for absolute browser compatibility.
  - Instantly down-samples 10-bit HEVC/x265 anime files to 8-bit standard H.264 to prevent browser hardware decoder crashes.
  - Fast-seeking architecture ensures zero-delay jumping even on fully transcoded non-native formats (MKV/AVI).
  - Dynamic audio downmixing (locks complex 5.1/7.1 streams to safe 2-channel stereo for web).
- **Universal Search:** Fast, sticky search bar integrated directly into the navigation header.
- **Docker Production Ready:** Seamless deployment with a heavily optimized multi-stage Docker build and secure Read-Only media volumes.
- **Automated Media Scanning:** Intelligently parses complex release tags and deeply nested anime folders, auto-scanning your library in the background every 5 minutes.

## 🛠 Prerequisites

- **Docker & Docker Compose** (Recommended for Production)
- **Node.js** (v16+) & **FFmpeg** (If running bare-metal natively)

## 🐳 Getting Started (Docker - Recommended)

The easiest and safest way to run VintageStream is via Docker. 

### 1. API Configuration
Create a `.env` file in the root directory and add your TMDB API key:
```env
TMDB_API_KEY=your_tmdb_api_key
```

### 2. Configure Your Media Directory
Open the `docker-compose.yml` file and find the `volumes` section. You MUST change the left side of the volume mapping to point to the actual folder on your computer where your movies and shows are stored.

```yaml
    volumes:
      # Change /path/to/your/media to your actual media folder!
      # DO NOT change the :/media:ro part.
      - /path/to/your/media:/media:ro
      
      # This saves your thumbnails so they aren't lost on restart
      - /tmp/thumbnail-dir:/app/server/public/thumbnails
```
*Note: The `:ro` flag means "Read-Only". This is a strict safety measure ensuring the Docker container can NEVER accidentally modify or delete your media files.*

### 3. Deploy
Once configured, build and start the container:
```bash
docker-compose up --build -d
```
The app will be instantly available on your host machine at `http://localhost:5173`.

## 💻 Getting Started (Local Development)

### 1. Configuration
Create a \`.env\` file in the root directory:
```env
TMDB_API_KEY=your_tmdb_api_key
MEDIA_PATH=/absolute/path/to/your/media
PORT=3300
FRONTEND_PORT=3200
```

### 2. Boot the Stack
Run the backend and frontend in two separate terminal windows:
```bash
# Terminal 1: Backend
cd server
npm install
npm start

# Terminal 2: Frontend
cd client
npm install
npm run dev
```

## 📁 Media Folder Structure Best Practices

To get the best matches from TMDB, standard naming conventions are recommended, but the scanner is designed to be highly resilient against scene tags, release groups, and complex anime folder nesting. 

- **Movies:** \`Movie Title (Year).mkv\`
- **TV Shows:** \`Show Title/Season 01/Show Title S01E01.mkv\`

### Exact TMDB Matching
If the scanner guesses a movie incorrectly, you can force an exact match by including the TMDB ID anywhere in the file or folder name:
```
Movie Title [tmdb-12345].mkv
```

## 📝 License
MIT License
