const fs = require('fs');
const file = 'server/routes/api.js';
let content = fs.readFileSync(file, 'utf8');

const metadataRoute = `
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
      height: metadata.streams.find(s => s.codec_type === 'video')?.height
    });
  });
});
`;

content = content.replace('export default router;', metadataRoute + '\nexport default router;');
fs.writeFileSync(file, content);
