const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `  const handleLoadedMetadata = () => {
    // Native HTML5 gives us duration if it's original (Range request)
    if (videoRef.current.duration && videoRef.current.duration !== Infinity) {
      setDuration(videoRef.current.duration);
    }`;

const newCode = `  const handleLoadedMetadata = () => {
    // Native HTML5 gives us duration if it's original (Range request)
    if (quality === 'original' && videoRef.current.duration && videoRef.current.duration !== Infinity) {
      setDuration(videoRef.current.duration);
    }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(file, content);
