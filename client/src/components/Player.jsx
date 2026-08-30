import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, ArrowLeft, Settings, Volume2, VolumeX } from 'lucide-react';
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
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState('original');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  // Time and duration tracking
  const [currentTime, setCurrentTime] = useState(0); // Display time
  const [duration, setDuration] = useState(0); // Total video duration
  const [offsetTime, setOffsetTime] = useState(0); // Offset when transcoding
  const [isSeeking, setIsSeeking] = useState(false);

  // Volume
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const controlsTimeout = useRef(null);

  // Initialize video source
  const getVideoSrc = (qual, time) => {
    return `${STREAM_BASE}?id=${id}&resolution=${qual}&time=${Math.floor(time)}`;
  };

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
    if (videoRef.current.duration && videoRef.current.duration !== Infinity) {
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
      setOffsetTime(newTime);
      videoRef.current.src = getVideoSrc(quality, newTime);
      videoRef.current.play();
    }
  };

  const changeQuality = (newQuality) => {
    if (newQuality === quality) return;
    
    // Remember absolute time before changing
    const absTime = offsetTime + videoRef.current.currentTime;
    setQuality(newQuality);
    setShowQualityMenu(false);
    
    if (newQuality === 'original') {
      // Revert to native streaming
      setOffsetTime(0);
      videoRef.current.src = getVideoSrc(newQuality, 0);
      videoRef.current.currentTime = absTime; // Browser will handle the range request
    } else {
      // Switch to FFmpeg transcoding
      setOffsetTime(absTime);
      videoRef.current.src = getVideoSrc(newQuality, absTime);
    }
    videoRef.current.play();
  };

  const skip = (amount) => {
    const target = Math.max(0, Math.min(currentTime + amount, duration || Infinity));
    if (quality === 'original') {
      videoRef.current.currentTime += amount;
    } else {
      setOffsetTime(target);
      videoRef.current.src = getVideoSrc(quality, target);
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
    <div className="relative w-screen h-screen bg-black overflow-hidden group">
      <video
        ref={videoRef}
        src={getVideoSrc(quality, 0)}
        className="w-full h-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
        autoPlay
      />

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
            </div>

            {/* Bottom Bar */}
            <div className="p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto flex flex-col space-y-4">
              
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
                  disabled={!duration} // Disable seek if duration unknown
                />
                <span className="text-sm font-medium text-gray-300">{formatTime(duration)}</span>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                
                <div className="flex items-center space-x-6">
                  <button onClick={togglePlay} className="text-white hover:text-brand-red transition">
                    {isPlaying ? <Pause size={32} /> : <Play size={32} fill="white" />}
                  </button>
                  
                  <button onClick={() => skip(-10)} className="text-white hover:text-gray-300 transition">
                    <SkipBack size={24} />
                  </button>
                  
                  <button onClick={() => skip(10)} className="text-white hover:text-gray-300 transition">
                    <SkipForward size={24} />
                  </button>

                  <div className="flex items-center space-x-2 group/vol">
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
                
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <button 
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      className="text-white hover:text-gray-300 flex items-center space-x-2 transition"
                    >
                      <Settings size={24} />
                      <span className="uppercase text-sm font-semibold">{quality === 'original' ? 'Auto' : `${quality}p`}</span>
                    </button>
                    
                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-4 bg-gray-900 rounded-lg py-2 min-w-[120px] shadow-2xl border border-gray-800">
                        {['original', '1080', '720', '480'].map(q => (
                          <button
                            key={q}
                            onClick={() => changeQuality(q)}
                            className={`block w-full text-left px-4 py-2 hover:bg-gray-800 transition ${quality === q ? 'text-brand-red font-bold' : 'text-gray-200'}`}
                          >
                            {q === 'original' ? 'Original (Seekable)' : `${q}p`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
