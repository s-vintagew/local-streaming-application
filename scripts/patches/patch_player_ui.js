const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Rewrite the AnimatePresence block for controls
const oldOverlayStart = `      {/* Controls Overlay */}
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
            </div>`;

const newOverlayStart = `      {/* Controls Overlay */}
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
                    <span className="uppercase text-sm font-semibold hidden sm:inline">{quality === 'original' ? 'Auto' : \`\${quality}p\`}</span>
                  </button>
                  
                  {showQualityMenu && (
                    <div className="absolute top-full right-0 mt-4 bg-gray-900 rounded-lg py-2 min-w-[120px] shadow-2xl border border-gray-800">
                      {['original', 'transmux', '1080', '720', '480'].map(q => (
                        <button
                          key={q}
                          onClick={() => changeQuality(q)}
                          className={\`block w-full text-left px-4 py-2 hover:bg-gray-800 transition \${quality === q ? 'text-brand-red font-bold' : 'text-gray-200'}\`}
                        >
                          {q === 'original' ? 'Original' : q === 'transmux' ? 'Direct' : \`\${q}p\`}
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
            </div>`;

content = content.replace(oldOverlayStart, newOverlayStart);

// 2. Remove the old bottom controls (except volume which we can keep on desktop)
// The bottom bar starts with {/* Bottom Bar */} and ends before </motion.div>
const oldBottomMatch = /\{\/\* Bottom Bar \*\/\}(.|\n)*?(?=<\/motion.div>)/;

const newBottom = `{/* Bottom Bar */}
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
          `;

content = content.replace(oldBottomMatch, newBottom);

fs.writeFileSync(file, content);
