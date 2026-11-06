import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { Play, Pause, SkipBack, SkipForward, ArrowLeft, Settings, Volume2, VolumeX, Maximize, Minimize, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STREAM_BASE = import.meta.env.VITE_STREAM_BASE || '/stream';

const sessionKey = (mediaId, resolution) => {
  const safeId = String(mediaId).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeRes = String(resolution || '720').replace(/[^a-zA-Z0-9]/g, '');
  return `${safeId}_${safeRes}`;
};

const qualityLabel = (q) => {
  if (q === 'original') return 'Original';
  if (q === 'transmux') return 'Remux';
  return `${q}p`;
};

const LANG_NAMES = {
  eng: 'English', en: 'English', hin: 'Hindi', spa: 'Spanish', fre: 'French', fra: 'French',
  ger: 'German', deu: 'German', ita: 'Italian', jpn: 'Japanese', kor: 'Korean',
  chi: 'Chinese', zho: 'Chinese', rus: 'Russian', por: 'Portuguese', pol: 'Polish',
  ara: 'Arabic', dut: 'Dutch', nld: 'Dutch', swe: 'Swedish', tur: 'Turkish',
  tha: 'Thai', vie: 'Vietnamese', und: 'Unknown'
};

const parseVttTime = (value) => {
  const parts = value.trim().split(':');
  if (parts.length === 3) return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + parseFloat(parts[2]);
  if (parts.length === 2) return Number(parts[0]) * 60 + parseFloat(parts[1]);
  return parseFloat(value);
};

const parseVtt = (raw) => {
  const cues = [];
  const blocks = String(raw).replace(/\r/g, '').split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim() !== '');
    const timeLine = lines.find((line) => line.includes('-->'));
    if (!timeLine) continue;
    const match = timeLine.match(/([\d:.]+)\s*-->\s*([\d:.]+)/);
    if (!match) continue;
    const idx = lines.indexOf(timeLine);
    const text = lines.slice(idx + 1).join('\n').replace(/<[^>]+>/g, '').trim();
    if (!text) continue;
    cues.push({ start: parseVttTime(match[1]), end: parseVttTime(match[2]), text });
  }
  return cues;
};

const subtitleLabel = (sub) => {
  const known = sub.language && sub.language !== 'und' ? LANG_NAMES[sub.language] : '';
  if (sub.source === 'file' && !known) {
    if (!sub.title || sub.title === 'External') return 'Subtitles';
    return sub.title;
  }
  const lang = known || sub.language || 'Unknown';
  let extra = sub.title || '';
  if (extra.length > 36 || /1080p|WEBRip|GalaxyRG|x264|x265/i.test(extra)) extra = '';
  if (/^sdh$/i.test(sub.title || '')) extra = 'SDH';
  const base = extra ? `${lang} (${extra})` : lang;
  if (!sub.supported) return `${base} (image — not supported)`;
  return base;
};

const cueAt = (cues, time) => {
  for (let i = 0; i < cues.length; i += 1) {
    if (time >= cues[i].start && time < cues[i].end) return cues[i].text;
  }
  return '';
};

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
  const hlsRef = useRef(null);
  const pendingSeekRef = useRef(null);
  const offsetTimeRef = useRef(0);
  const qualityRef = useRef('');
  const hlsRestartTimer = useRef(null);
  const hlsGenRef = useRef(0);
  const hlsFatalRetries = useRef(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    return () => {
      if (hlsRestartTimer.current) clearTimeout(hlsRestartTimer.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, []);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState('');
  const [playMode, setPlayMode] = useState('');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [offsetTime, setOffsetTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Volume
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [subtitles, setSubtitles] = useState([]);
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [subtitleCues, setSubtitleCues] = useState([]);

  const controlsTimeout = useRef(null);

  const HLS_SEEK_SLACK = 10;

  const applyOffset = (seconds) => {
    const t = Math.max(0, seconds || 0);
    offsetTimeRef.current = t;
    setOffsetTime(t);
  };

  const absTime = () => offsetTimeRef.current + (videoRef.current?.currentTime || 0);

  const bufferedAbsEnd = () => {
    const video = videoRef.current;
    if (!video?.buffered?.length) return offsetTimeRef.current;
    return offsetTimeRef.current + video.buffered.end(video.buffered.length - 1);
  };

  const getVideoSrc = (qual, start = 0) => {
    if (qual === 'original') {
      return `${STREAM_BASE}?id=${id}&resolution=original`;
    }
    const key = sessionKey(id, qual);
    const startSec = Math.floor(Math.max(0, start || 0));
    return `${STREAM_BASE}/hls/${key}/index.m3u8?id=${encodeURIComponent(id)}&resolution=${encodeURIComponent(qual)}&start=${startSec}&n=${Date.now()}`;
  };

  const flushHlsRestart = (qual, start) => {
    const startSec = Math.floor(Math.max(0, start || 0));
    applyOffset(startSec);
    pendingSeekRef.current = 0;
    setIsBuffering(true);
    setVideoUrl(getVideoSrc(qual, startSec));
  };

  const scheduleHlsRestart = (qual, start, immediate = false) => {
    const startSec = Math.floor(Math.max(0, start || 0));
    applyOffset(startSec);
    pendingSeekRef.current = 0;
    setIsBuffering(true);
    if (hlsRestartTimer.current) clearTimeout(hlsRestartTimer.current);
    if (immediate) {
      flushHlsRestart(qual, startSec);
      return;
    }
    hlsRestartTimer.current = setTimeout(() => {
      flushHlsRestart(qual, startSec);
    }, 400);
  };

  const seekTo = (nextAbs) => {
    const target = Math.max(0, Math.min(nextAbs, duration || nextAbs));
    setCurrentTime(target);
    if (!videoRef.current) return;
    const qual = qualityRef.current || quality;

    if (qual === 'original') {
      if (hlsRestartTimer.current) clearTimeout(hlsRestartTimer.current);
      videoRef.current.currentTime = target;
      return;
    }

    const windowStart = offsetTimeRef.current;
    const windowEnd = bufferedAbsEnd();
    if (target >= windowStart - 1 && target <= windowEnd + HLS_SEEK_SLACK) {
      if (hlsRestartTimer.current) clearTimeout(hlsRestartTimer.current);
      videoRef.current.currentTime = Math.max(0, target - windowStart);
      return;
    }

    scheduleHlsRestart(qual, target);
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/metadata?id=${id}`);
        const data = await res.json();
        if (data.duration) {
          setDuration(data.duration);
        }
        if (data.subtitles) {
          setSubtitles(data.subtitles);
        }
        setActiveSubtitle(null);
        setSubtitleCues([]);
        setPlayMode(data.playMode || '');
        let initQ = data.recommendedQuality || '720';
        if (initQ === '1080') initQ = '720';
        qualityRef.current = initQ;
        setQuality(initQ);
        setVideoUrl(getVideoSrc(initQ));
      } catch (err) {
        console.error('Failed to fetch metadata', err);
      }
    };
    fetchMetadata();
  }, [id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return undefined;

    const playFromPending = () => {
      if (pendingSeekRef.current != null && Number.isFinite(pendingSeekRef.current)) {
        video.currentTime = pendingSeekRef.current;
        pendingSeekRef.current = null;
      }
      video.play().catch(() => {});
    };

    if (quality === 'original') {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.src = videoUrl;
      playFromPending();
      return undefined;
    }

    if (Hls.isSupported()) {
      const gen = ++hlsGenRef.current;
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 60,
        backBufferLength: 30,
        startPosition: 0
      });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (gen !== hlsGenRef.current) return;
        hlsFatalRetries.current = 0;
        playFromPending();
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (gen !== hlsGenRef.current || !data?.fatal) return;
        console.error('HLS error', data.type, data.details);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }
        const qual = qualityRef.current;
        if (qual && qual !== 'original' && hlsFatalRetries.current < 2) {
          hlsFatalRetries.current += 1;
          scheduleHlsRestart(qual, offsetTimeRef.current, true);
        }
      });
      return () => {
        hlsGenRef.current += 1;
        hls.destroy();
        if (hlsRef.current === hls) hlsRef.current = null;
      };
    }

    video.src = videoUrl;
    playFromPending();
    return undefined;
  }, [videoUrl, quality]);

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
  }, [isPlaying, currentTime, duration, quality]);


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


  useEffect(() => {
    if (activeSubtitle === null) {
      setSubtitleCues([]);
      return undefined;
    }
    const selected = subtitles.find((s) => s.index === activeSubtitle);
    if (!selected?.supported) {
      setSubtitleCues([]);
      return undefined;
    }
    let cancelled = false;
    fetch(`/api/subtitle?id=${encodeURIComponent(id)}&index=${encodeURIComponent(activeSubtitle)}`)
      .then((res) => {
        if (!res.ok) throw new Error('subtitle fetch failed');
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setSubtitleCues(parseVtt(text));
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setSubtitleCues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id, activeSubtitle, subtitles]);

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    if (!isSeeking && videoRef.current) {
      setCurrentTime(offsetTimeRef.current + videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (quality === 'original' && videoRef.current.duration && videoRef.current.duration !== Infinity) {
      setDuration(videoRef.current.duration);
    }
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
    seekTo(parseFloat(e.target.value));
  };

  const changeQuality = (newQuality) => {
    if (newQuality === quality) return;
    const at = absTime();
    qualityRef.current = newQuality;
    setQuality(newQuality);
    setShowQualityMenu(false);
    if (hlsRestartTimer.current) clearTimeout(hlsRestartTimer.current);
    if (newQuality === 'original') {
      applyOffset(0);
      pendingSeekRef.current = at;
      setIsBuffering(true);
      setVideoUrl(getVideoSrc(newQuality));
      return;
    }
    scheduleHlsRestart(newQuality, at, true);
  };

  const skip = (amount) => {
    seekTo(absTime() + amount);
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
        className="w-full h-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => {
          setIsBuffering(false);
        }}
        autoPlay
      />
      {!!cueAt(subtitleCues, currentTime) && (
        <div
          className={`absolute left-0 right-0 z-[15] pointer-events-none flex justify-center px-6 md:px-16 ${showControls ? 'bottom-28' : 'bottom-12'}`}
        >
          <p className="player-cue text-center text-lg md:text-2xl font-semibold text-white max-w-4xl whitespace-pre-line leading-snug">
            {cueAt(subtitleCues, currentTime)}
          </p>
        </div>
      )}

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
                
                {/* Subtitles Menu */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowSubtitleMenu(!showSubtitleMenu);
                      setShowQualityMenu(false);
                    }}
                    className={`text-white hover:text-brand-red flex items-center space-x-2 transition ${activeSubtitle !== null ? 'text-brand-red' : ''}`}
                  >
                    <MessageSquare size={24} />
                  </button>
                  
                  {showSubtitleMenu && (
                    <div className="absolute top-full right-0 mt-4 bg-gray-900 rounded-lg py-2 min-w-[220px] max-h-[60vh] overflow-y-auto shadow-2xl border border-gray-800">
                      <button
                        onClick={() => { setActiveSubtitle(null); setShowSubtitleMenu(false); }}
                        className={`block w-full text-left px-4 py-2 hover:bg-gray-800 transition ${activeSubtitle === null ? 'text-brand-red font-bold' : 'text-gray-200'}`}
                      >
                        Off
                      </button>
                      {subtitles.length === 0 && (
                        <p className="px-4 py-2 text-sm text-gray-500">No subtitle files</p>
                      )}
                      {subtitles.map(sub => (
                        <button
                          key={sub.index}
                          disabled={!sub.supported}
                          onClick={() => {
                            if (!sub.supported) return;
                            setActiveSubtitle(sub.index);
                            setShowSubtitleMenu(false);
                          }}
                          className={`block w-full text-left px-4 py-2 transition ${!sub.supported ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-gray-800'} ${activeSubtitle === sub.index ? 'text-brand-red font-bold' : 'text-gray-200'}`}
                        >
                          {subtitleLabel(sub)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowQualityMenu(!showQualityMenu);
                      setShowSubtitleMenu(false);
                    }}
                    className="text-white hover:text-gray-300 flex items-center space-x-2 transition"
                  >
                    <Settings size={24} />
                    <span className="uppercase text-sm font-semibold hidden sm:inline">{qualityLabel(quality)}</span>
                  </button>
                  
                  {showQualityMenu && (
                    <div className="absolute top-full right-0 mt-4 bg-gray-900 rounded-lg py-2 min-w-[120px] shadow-2xl border border-gray-800">
                      {(playMode === 'original' ? ['original', 'transmux', '720', '480'] : playMode === 'transmux' ? ['transmux', '720', '480'] : ['720', '480']).map(q => (
                        <button
                          key={q}
                          onClick={() => changeQuality(q)}
                          className={`block w-full text-left px-4 py-2 hover:bg-gray-800 transition ${quality === q ? 'text-brand-red font-bold' : 'text-gray-200'}`}
                        >
                          {qualityLabel(q)}
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
