const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add videoUrl state
content = content.replace("const [isMuted, setIsMuted] = useState(false);", "const [isMuted, setIsMuted] = useState(false);\n  const [videoUrl, setVideoUrl] = useState('');");

// Update fetchMetadata to set initial videoUrl
const oldMeta = `        if (!quality) {
           setQuality(isNative ? 'original' : '1080');
        } else if (!isNative && quality === 'original') {
           setQuality('1080'); 
        }`;
const newMeta = `        if (!quality) {
           const initQ = isNative ? 'original' : '1080';
           setQuality(initQ);
           setVideoUrl(getVideoSrc(initQ, 0));
        } else if (!isNative && quality === 'original') {
           setQuality('1080'); 
           setVideoUrl(getVideoSrc('1080', 0));
        }`;
content = content.replace(oldMeta, newMeta);

// Update imperative src assignments to also update videoUrl state
content = content.replace(/videoRef\.current\.src = getVideoSrc\(([^,]+),\s*([^)]+)\);/g, "setVideoUrl(getVideoSrc($1, $2));");

// Update video src prop
content = content.replace(/src=\{quality \? getVideoSrc\(quality, 0\) : ""\}/, "src={videoUrl}");

fs.writeFileSync(file, content);
