const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the initial state
content = content.replace("const [quality, setQuality] = useState('original');", "const [quality, setQuality] = useState(''); // Empty until metadata loaded");

// Replace the metadata block to set the initial quality
const oldMeta = `        // If not natively streamable (e.g., mkv, avi), force transcode mode
        const isNative = data.extension === '.mp4' || data.extension === '.webm';
        if (!isNative && quality === 'original') {
          // HEVC (x265) MKVs cannot be transmuxed directly to MP4 for Chrome.
          // We must re-encode (1080) to guarantee playback, even if it takes a second to buffer.
          setQuality('1080'); 
        }`;

const newMeta = `        // If not natively streamable (e.g., mkv, avi), force transcode mode
        const isNative = data.extension === '.mp4' || data.extension === '.webm';
        if (!quality) {
           setQuality(isNative ? 'original' : '1080');
        } else if (!isNative && quality === 'original') {
           setQuality('1080'); 
        }`;
content = content.replace(oldMeta, newMeta);

// Do not render video src until quality is known
content = content.replace('src={getVideoSrc(quality, 0)}', 'src={quality ? getVideoSrc(quality, 0) : ""}');

fs.writeFileSync(file, content);
