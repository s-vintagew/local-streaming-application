import express from 'express';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import { getLibrary, scanMedia } from '../utils/scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const THUMB_DIR = path.join(__dirname, '..', 'public', 'thumbnails');

// Ensure thumbnails directory exists
if (!fs.existsSync(THUMB_DIR)) {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
}

const router = express.Router();

router.get('/library', (req, res) => {
  res.json(getLibrary());
});

router.post('/scan', async (req, res) => {
  await scanMedia();
  res.json({ success: true, library: getLibrary() });
});

router.get('/thumbnail', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send('Missing id');

  const library = getLibrary();
  let media = library.movies.find(m => m.id === id);
  if (!media) {
    for (const show of library.shows) {
      if (show.id === id) {
        // Use first episode of show for thumbnail
        media = show.episodes[0];
        break;
      }
      const ep = show.episodes.find(e => e.id === id);
      if (ep) {
        media = ep;
        break;
      }
    }
  }

  if (!media) return res.status(404).send('Media not found');

  const thumbPath = path.join(THUMB_DIR, `${id}.jpg`);

  if (fs.existsSync(thumbPath)) {
    return res.sendFile(thumbPath);
  }

  // Generate thumbnail on the fly
  ffmpeg(media.path)
    .on('end', () => {
      res.sendFile(thumbPath);
    })
    .on('error', (err) => {
      console.error('Error generating thumbnail:', err.message);
      res.status(500).send('Thumbnail generation failed');
    })
    .screenshots({
      count: 1,
      timestamps: ['10%'],
      folder: THUMB_DIR,
      filename: `${id}.jpg`
    });
});


router.get('/metadata', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send('Missing id');

  const library = getLibrary();
  let media = library.movies.find(m => m.id === id);
  if (!media) {
    for (const show of library.shows) {
      const ep = show.episodes.find(e => e.id === id);
      if (ep) {
        media = ep;
        break;
      }
    }
  }

  if (!media) return res.status(404).send('Media not found');

  ffmpeg.ffprobe(media.path, (err, metadata) => {
    if (err) {
      console.error('ffprobe error:', err.message);
      return res.status(500).json({ error: 'Failed to probe media' });
    }
    res.json({
      duration: metadata.format.duration, // Precise duration in seconds
      format: metadata.format.format_name,
      extension: path.extname(media.path).toLowerCase(),
      width: metadata.streams.find(s => s.codec_type === 'video')?.width,
      height: metadata.streams.find(s => s.codec_type === 'video')?.height,
      subtitles: metadata.streams
        .filter(s => s.codec_type === 'subtitle')
        .map(s => ({
          index: s.index,
          language: (s.tags && s.tags.language) ? s.tags.language : 'und',
          title: (s.tags && s.tags.title) ? s.tags.title : `Track ${s.index}`
        }))
    });
  });
});



router.get('/subtitle', (req, res) => {
  const { id, index } = req.query;
  if (!id || index === undefined) return res.status(400).send('Missing id or index');

  const library = getLibrary();
  let media = library.movies.find(m => m.id === id);
  if (!media) {
    for (const show of library.shows) {
      const ep = show.episodes.find(e => e.id === id);
      if (ep) {
        media = ep;
        break;
      }
    }
  }

  if (!media) return res.status(404).send('Media not found');

  res.setHeader('Content-Type', 'text/vtt');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const command = ffmpeg(media.path)
    .outputOptions([
      `-map 0:${index}`,
      '-f webvtt'
    ])
    .on('error', (err) => {
      if (err.message !== 'Output stream closed' && err.message !== 'ffmpeg was killed with signal SIGKILL') {
        console.error('Subtitle FFmpeg Error:', err.message);
      }
    });

  command.pipe(res, { end: true });

  req.on('close', () => {
    command.kill('SIGKILL');
  });
});

export default router;
