const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

const hook = `  // Initialize video source
  const getVideoSrc = (qual, time) => {
    return \`\${STREAM_BASE}?id=\${id}&resolution=\${qual}&time=\${Math.floor(time)}\`;
  };`;

const metadataBlock = `
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(\`/api/metadata?id=\${id}\`);
        const data = await res.json();
        if (data.duration) {
          setDuration(data.duration);
        }
        // If not natively streamable (e.g., mkv, avi), force transcode mode
        const isNative = data.extension === '.mp4' || data.extension === '.webm';
        if (!isNative && quality === 'original') {
          setQuality('transmux'); // Fallback to zero-cpu transmux
        }
      } catch (err) {
        console.error('Failed to fetch metadata', err);
      }
    };
    fetchMetadata();
  }, [id, quality]);
`;

content = content.replace(hook, hook + '\n' + metadataBlock);
fs.writeFileSync(file, content);
