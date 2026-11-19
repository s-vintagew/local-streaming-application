import express from 'express';
import fs from 'fs';
import path from 'path';
import { findMediaById } from '../utils/scanner.js';
import { ensureHlsJob, resolveHlsFile, sessionKey, JobCancelled } from '../utils/hlsTranscoder.js';

const router = express.Router();

const MIME = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo'
};

// originalTitle is the filename with the extension removed. Downloads need it back
// so the saved file opens as video instead of an extension-less blob.
const downloadFileName = (media) => {
  const fromPath = path.extname(media.path || '').toLowerCase();
  const ext = /^\.[a-z0-9]{1,8}$/.test(fromPath) ? fromPath : '.mp4';
  let base = String(media.originalTitle || path.basename(media.path || '', fromPath) || 'video');
  base = base.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base) base = 'video';
  if (base.toLowerCase().endsWith(ext)) return base;
  return `${base}${ext}`;
};

const attachmentDisposition = (filename) => {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (ch) =>
    `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
};

const rangeOriginal = (req, res, media) => {
  const videoPath = media.path;
  if (!fs.existsSync(videoPath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const download = req.query.download === 'true';
  const ext = path.extname(videoPath).toLowerCase();
  const disposition = download
    ? attachmentDisposition(downloadFileName(media))
    : 'inline';
  const contentType = download ? 'application/octet-stream' : (MIME[ext] || 'video/mp4');

  if (range && !download) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    if (Number.isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
      return res.end();
    }
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Content-Disposition': disposition
    });
    file.pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Length': fileSize,
    'Accept-Ranges': 'bytes',
    'Content-Type': contentType,
    'Content-Disposition': disposition
  });
  fs.createReadStream(videoPath).pipe(res);
};

router.get('/hls/:session/:file', async (req, res) => {
  const { session, file } = req.params;
  const { id, resolution, start } = req.query;

  if (file === 'index.m3u8' && id && resolution) {
    if (sessionKey(id, resolution) !== session) {
      return res.status(400).send('Session mismatch');
    }
    const media = findMediaById(id);
    if (!media) return res.status(404).send('Media not found');
    try {
      await ensureHlsJob({
        id,
        resolution,
        mediaPath: media.path,
        startTime: Number(start) || 0,
        isAborted: () => req.destroyed || req.aborted
      });
    } catch (err) {
      if (req.destroyed || req.aborted) return;
      if (err instanceof JobCancelled) {
        const ready = resolveHlsFile(session, file);
        if (ready && fs.existsSync(ready)) {
          // Latest job already produced this playlist.
        } else {
          return res.status(409).send('superseded');
        }
      } else {
        console.error('HLS start failed:', err.message);
        return res.status(503).send('Transcoder failed to start');
      }
    }
  }

  const full = resolveHlsFile(session, file);
  if (!full || !fs.existsSync(full)) {
    return res.status(404).send('Segment not ready');
  }

  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (full.endsWith('.m3u8')) {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  } else {
    res.setHeader('Content-Type', 'video/MP2T');
  }
  fs.createReadStream(full).pipe(res);
});

// :filename is the suggested save name only. The id query selects the file.
const serveStream = (req, res) => {
  const { id, resolution, download } = req.query;
  if (!id) {
    return res.status(400).send('Missing video id');
  }

  const media = findMediaById(id);
  if (!media) {
    return res.status(404).send('Media not found');
  }

  if (download === 'true' || !resolution || resolution === 'original') {
    return rangeOriginal(req, res, media);
  }

  const key = sessionKey(id, resolution);
  const start = Number(req.query.time || req.query.start || 0) || 0;
  return res.redirect(`/stream/hls/${key}/index.m3u8?id=${encodeURIComponent(id)}&resolution=${encodeURIComponent(resolution)}&start=${Math.floor(start)}`);
};

router.get('/file/:filename', serveStream);
router.get('/', serveStream);

export default router;
