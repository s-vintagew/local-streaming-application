const fs = require('fs');
const file = 'server/routes/api.js';
let content = fs.readFileSync(file, 'utf8');

// Update /metadata
const oldMetadata = `    res.json({
      duration: metadata.format.duration, // Precise duration in seconds
      format: metadata.format.format_name,
      extension: path.extname(media.path).toLowerCase(),
      width: metadata.streams.find(s => s.codec_type === 'video')?.width,
      height: metadata.streams.find(s => s.codec_type === 'video')?.height
    });`;

const newMetadata = `    res.json({
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
          title: (s.tags && s.tags.title) ? s.tags.title : \`Track \${s.index}\`
        }))
    });`;

content = content.replace(oldMetadata, newMetadata);

// Add /subtitle endpoint
const subtitleEndpoint = `

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
      \`-map 0:\${index}\`,
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

`;

content = content.replace('export default router;', subtitleEndpoint + 'export default router;');
fs.writeFileSync(file, content);
