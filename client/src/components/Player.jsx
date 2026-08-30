import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, ArrowLeft, Settings, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STREAM_BASE = import.meta.env.VITE_STREAM_BASE || '/stream';

const formatTime = (timeInSeconds) => {
  if (isNaN(timeInSeconds) || timeInSeconds === Infinity) return '00:00';
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function Player() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const lastTapRef = useRef({ time: 0, zone: '' });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState(''); // Empty until metadata loaded
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true); // Default to true while loading
  
  // Time and duration tracking
  const [currentTime, setCurrentTime] = useState(0); // Display time
  const [duration, setDuration] = useState(0); // Total video duration
  const [offsetTime, setOffsetTime] = useState(0); // Offset when transcoding
  const [isSeeking, setIsSeeking] = useState(false);

  // Volume
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const controlsTimeout = useRef(null);

  // Initialize video source
  const getVideoSrc = (qual, time) => {
    return `${STREAM_BASE}?id=${id}&resolution=${qual}&time=${Math.floor(time)}`;
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/metadata?id=${id}`);
        const data = await res.json();
        if (data.duration) {
          setDuration(data.duration);
        }
        // If not natively streamable (e.g., mkv, avi), force transcode mode
        const isNative = data.extension === '.mp4' || data.extension === '.webm';
        if (!quality) {
           const initQ = isNative ? 'original' : '1080';
           setQuality(initQ);
           setVideoUrl(getVideoSrc(initQ, 0));
        } else if (!isNative && quality === 'original') {
           setQuality('1080'); 
           setVideoUrl(getVideoSrc('1080', 0));
        }
      } catch (err) {
        console.error('Failed to fetch metadata', err);
      }
    };
    fetchMetadata();
  }, [id, quality]);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      resetControlsTimeout();
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isPlaying]);

  const resetControlsTimeout = () => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const toggleFullscreen = async () => {
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

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (!isSeeking && videoRef.current) {
      setCurrentTime(offsetTime + videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    // Native HTML5 gives us duration if it's original (Range request)
    if (quality === 'original' && videoRef.current.duration && videoRef.current.duration !== Infinity) {
      setDuration(videoRef.current.duration);
    }
    // Restore volume
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
  };

  const handleSeekChange = (e) => {
    setIsSeeking(true);
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const handleSeekMouseUp = (e) => {
    setIsSeeking(false);
    const newTime = parseFloat(e.target.value);
    
    if (quality === 'original') {
      // Native seek
      videoRef.current.currentTime = newTime;
      setOffsetTime(0);
    } else {
      // Transcoded seek requires re-fetching from backend
      setIsBuffering(true);
      setOffsetTime(newTime);
      setVideoUrl(getVideoSrc(quality, newTime));
      videoRef.current.play();
    }
  };

  const changeQuality = (newQuality) => {
    if (newQuality === quality) return;
    
    setIsBuffering(true);
    // Remember absolute time before changing
    const absTime = offsetTime + videoRef.current.currentTime;
    setQuality(newQuality);
    setShowQualityMenu(false);
    
    if (newQuality === 'original') {
      // Revert to native streaming
      setOffsetTime(0);
      setVideoUrl(getVideoSrc(newQuality, 0));
      videoRef.current.currentTime = absTime; // Browser will handle the range request
    } else {
      // Switch to FFmpeg transcoding
      setOffsetTime(absTime);
      setVideoUrl(getVideoSrc(newQuality, absTime));
    }
    videoRef.current.play();
  };

  const skip = (amount) => {
    const target = Math.max(0, Math.min(currentTime + amount, duration || Infinity));
    if (quality === 'original') {
      videoRef.current.currentTime += amount;
    } else {
      setIsBuffering(true);
      setOffsetTime(target);
      setVideoUrl(getVideoSrc(quality, target));
      videoRef.current.play();
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    videoRef.current.volume = val;
    if (val > 0 && isMuted) {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-black overflow-hidden group">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
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
      </div>

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 border-4 border-white/20 border-t-brand-red rounded-full animate-spin"></div>
        </div>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none"
          >
            {/* Top Bar */}
            <div className="flex justify-between items-center p-6 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">
              <button onClick={() => navigate(-1)} className="text-white hover:text-gray-300 transition">
                <ArrowLeft size={32} />
              </button>
              
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <button 
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="text-white hover:text-gray-300 flex items-center space-x-2 transition"
                  >
                    <Settings size={24} />
                    <span className="uppercase text-sm font-semibold hidden sm:inline">{quality === 'original' ? 'Auto' : `${quality}p`}</span>
                  </button>
                  
                  {showQualityMenu && (
                    <div className="absolute top-full right-0 mt-4 bg-gray-900 rounded-lg py-2 min-w-[120px] shadow-2xl border border-gray-800">
                      {['original', 'transmux', '1080', '720', '480'].map(q => (
                        <button
                          key={q}
                          onClick={() => changeQuality(q)}
                          className={`block w-full text-left px-4 py-2 hover:bg-gray-800 transition ${quality === q ? 'text-brand-red font-bold' : 'text-gray-200'}`}
                        >
                          {q === 'original' ? 'Original' : q === 'transmux' ? 'Direct' : `${q}p`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <button onClick={toggleFullscreen} className="text-white hover:text-brand-red transition">
                  {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
              </div>
            </div>

            {/* Center Big Controls */}
            <div className="absolute inset-0 flex items-center justify-center space-x-8 md:space-x-16 pointer-events-none">
              <button onClick={() => skip(-10)} className="text-white hover:text-gray-300 transition pointer-events-auto bg-black/40 rounded-full p-3 md:p-4 hover:scale-110 active:scale-90">
                <SkipBack size={32} />
              </button>
              <button onClick={togglePlay} className="text-white hover:text-brand-red transition pointer-events-auto bg-black/40 rounded-full p-4 md:p-6 hover:scale-110 active:scale-90">
                {isPlaying ? <Pause size={48} /> : <Play size={48} fill="white" />}
              </button>
              <button onClick={() => skip(10)} className="text-white hover:text-gray-300 transition pointer-events-auto bg-black/40 rounded-full p-3 md:p-4 hover:scale-110 active:scale-90">
                <SkipForward size={32} />
              </button>
            </div>

            {/* Bottom Bar */}
            <div className="p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto flex flex-col space-y-4 z-10">
              
              {/* Seekbar */}
              <div className="flex items-center space-x-4 w-full">
                <span className="text-sm font-medium text-white">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekMouseUp}
                  onTouchEnd={handleSeekMouseUp}
                  className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-brand-red"
                  disabled={!duration}
                />
                <span className="text-sm font-medium text-gray-300">{formatTime(duration)}</span>
              </div>

              {/* Volume (Desktop Only) */}
              <div className="hidden md:flex items-center space-x-2 group/vol w-32">
                <button onClick={toggleMute} className="text-white hover:text-gray-300 transition">
                  {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-brand-red"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
