const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add lucide imports
content = content.replace("Settings, Volume2, VolumeX } from 'lucide-react';", "Settings, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';");

// 2. Add containerRef and isFullscreen state
content = content.replace("const videoRef = useRef(null);", "const videoRef = useRef(null);\n  const containerRef = useRef(null);\n  const [isFullscreen, setIsFullscreen] = useState(false);");

// 3. Add toggleFullscreen function and keyboard event listener
const keyboardLogic = `  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        skip(10);
      } else if (e.code === 'ArrowLeft') {
        skip(-10);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, quality, offsetTime]); // Include dependencies so skip() has fresh state

`;

// Insert it before togglePlay
content = content.replace("  const togglePlay = () => {", keyboardLogic + "  const togglePlay = () => {");

// 4. Attach containerRef to the main div
content = content.replace('<div className="relative w-screen h-screen bg-black overflow-hidden group">', '<div ref={containerRef} className="relative w-screen h-screen bg-black overflow-hidden group">');

// 5. Add Fullscreen button to the UI
const fsButton = `
                  <button onClick={toggleFullscreen} className="text-white hover:text-brand-red transition ml-4">
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                  </button>`;
// Find where to insert it: next to volume controls? No, next to quality button.
// The volume controls end with:
const volumeControlsEnd = `                  </div>
                </div>
              </div>
            </div>`;
// Actually, let's look at the structure to place it properly.
fs.writeFileSync(file, content);
