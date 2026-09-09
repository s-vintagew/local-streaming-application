const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = '  const [isFullscreen, setIsFullscreen] = useState(false);';
const cleanup = `  const [isFullscreen, setIsFullscreen] = useState(false);

  // Force kill the video stream connection when navigating away to prevent HTTP socket exhaustion
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, []);`;

content = content.replace(target, cleanup);
fs.writeFileSync(file, content);
