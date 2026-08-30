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

export default router;
