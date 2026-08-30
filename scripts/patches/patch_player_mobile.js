const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update toggleFullscreen to include orientation lock
const oldToggleFs = `  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };`;

const newToggleFs = `  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          try {
            await window.screen.orientation.lock('landscape');
          } catch (e) {
            console.log('Orientation lock failed:', e);
          }
        }
      }
    } else {
      if (document.exitFullscreen) {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
        await document.exitFullscreen();
      }
    }
  };`;

content = content.replace(oldToggleFs, newToggleFs);

// 2. Add touch handling logic
const lastTapRefDecl = `  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const lastTapRef = useRef({ time: 0, zone: '' });`;

content = content.replace("  const videoRef = useRef(null);\n  const containerRef = useRef(null);", lastTapRefDecl);

const mobileLogic = `
  const handleDesktopClick = (e) => {
    togglePlay();
  };

  const handleDesktopDoubleClick = (e) => {
    toggleFullscreen();
  };

  const handleMobileTouch = (e) => {
    e.preventDefault();
    const zone = e.target.getAttribute('data-zone') || 'center';
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current.time < DOUBLE_TAP_DELAY && lastTapRef.current.zone === zone) {
      if (zone === 'left') skip(-10);
      else if (zone === 'right') skip(10);
      else togglePlay();
      lastTapRef.current = { time: 0, zone: '' };
    } else {
      lastTapRef.current = { time: now, zone };
      setTimeout(() => {
        if (lastTapRef.current.time === now) {
          setShowControls(prev => !prev);
        }
      }, DOUBLE_TAP_DELAY + 10);
    }
  };
`;

content = content.replace("  const togglePlay = () => {", mobileLogic + "\n  const togglePlay = () => {");

// 3. Remove onClick from <video> and add the invisible touch zones overlay
const oldVideo = `        onCanPlay={() => setIsBuffering(false)}
        onClick={togglePlay}
        autoPlay
      />`;

const newVideo = `        onCanPlay={() => setIsBuffering(false)}
        autoPlay
      />

      {/* Touch / Click Zones */}
      <div 
        className="absolute inset-0 z-0 flex"
        onClick={handleDesktopClick}
        onDoubleClick={handleDesktopDoubleClick}
        onTouchEnd={handleMobileTouch}
      >
        <div className="w-1/3 h-full" data-zone="left" />
        <div className="w-1/3 h-full" data-zone="center" />
        <div className="w-1/3 h-full" data-zone="right" />
      </div>`;

content = content.replace(oldVideo, newVideo);

fs.writeFileSync(file, content);
