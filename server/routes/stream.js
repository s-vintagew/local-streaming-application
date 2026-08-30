import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import { getLibrary } from '../utils/scanner.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { id, resolution, time, download } = req.query;
  
  if (!id) {
    return res.status(400).send('Missing video id');
  }

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

  if (!media) {
    return res.status(404).send('Media not found');
  }

  const videoPath = media.path;
  const fileName = media.originalTitle || 'video.mp4';
  
  if (!fs.existsSync(videoPath)) {
    return res.status(404).send('File not found');
  }

  // Handle original quality (Native HTTP Streaming with Range Support)
  if (!resolution || resolution === 'original') {
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    const disposition = download === 'true' 
      ? `attachment; filename="${encodeURIComponent(fileName)}"` 
      : 'inline';
      
    const contentType = download === 'true' ? 'application/octet-stream' : 'video/mp4';

    // If forcing a download, ignore the Range header to prevent browsers from downloading a 2-byte probe chunk
    if (range && download !== 'true') {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Content-Disposition': disposition
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Content-Disposition': disposition
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
    return;
  }

  // Handle Transcoded Quality (via FFmpeg)
  const startTime = time ? parseInt(time) : 0;
  console.log(`Streaming requested: resolution=${resolution}, time=${time}, startTime=${startTime}`);

  
  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Transfer-Encoding': 'chunked',
    'Access-Control-Allow-Origin': '*'
  });

  const command = ffmpeg(videoPath)
    .seekInput(startTime)
    .format('mp4')
    .outputOptions([
      '-movflags frag_keyframe+empty_moov+default_base_moof+omit_tfhd_offset',
      '-avoid_negative_ts make_zero'
    ]);

  if (resolution === 'transmux') {
    // Zero-CPU video copy, only re-encode audio to AAC for browser compatibility
    command.videoCodec('copy').audioCodec('aac').audioChannels(2).audioFrequency(44100).audioBitrate('128k');
  } else {
    // Full transcode with scaling
    const resValue = parseInt(resolution);
    command.outputOptions(['-preset ultrafast', '-g 30', '-pix_fmt yuv420p'])
           .videoFilter(`scale=-2:${resValue}`)
           .videoCodec('libx264')
           .audioCodec('aac')
           .audioChannels(2)
           .audioFrequency(44100)
           .audioBitrate('128k');
  }

  command.on('error', (err) => {
    if (err.message !== 'Output stream closed' && err.message !== 'ffmpeg was killed with signal SIGKILL') {
      console.error('FFmpeg Error:', err.message);
    }
  });

  command.pipe(res, { end: true });

  req.on('close', () => {
    command.kill('SIGKILL');
  });
});

export default router;
