const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace("Minimize } from 'lucide-react';", "Minimize, MessageSquare } from 'lucide-react';");

// 2. State
const stateInsertion = `  const [subtitles, setSubtitles] = useState([]);
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);`;
content = content.replace("const [videoUrl, setVideoUrl] = useState('');", "const [videoUrl, setVideoUrl] = useState('');\n" + stateInsertion);

// 3. fetchMetadata
const oldFetch = `        if (data.duration) {
          setDuration(data.duration);
        }
        if (['.mp4', '.webm'].includes(data.extension)) {
          setQuality('original');
        } else {
          setQuality('1080');
        }`;

const newFetch = `        if (data.duration) {
          setDuration(data.duration);
        }
        if (data.subtitles) {
          setSubtitles(data.subtitles);
        }
        if (['.mp4', '.webm'].includes(data.extension)) {
          setQuality('original');
        } else {
          setQuality('1080');
        }`;
content = content.replace(oldFetch, newFetch);

// 4. Update track modes when activeSubtitle or videoUrl changes
const trackEffect = `
  useEffect(() => {
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        // We match by checking if this track corresponds to the activeSubtitle
        // React renders tracks in order of subtitles array
        if (activeSubtitle !== null && i === subtitles.findIndex(s => s.index === activeSubtitle)) {
          tracks[i].mode = 'showing';
        } else {
          tracks[i].mode = 'hidden';
        }
      }
    }
  }, [activeSubtitle, subtitles, videoUrl]);
`;
content = content.replace("  const togglePlay = () => {", trackEffect + "\n  const togglePlay = () => {");

// 5. Add <track> elements to <video>
const oldVideo = `        onCanPlay={() => setIsBuffering(false)}
        autoPlay
      />`;

const newVideo = `        onCanPlay={() => {
          setIsBuffering(false);
          // Force tracks update when video can play
          if (videoRef.current) {
            const tracks = videoRef.current.textTracks;
            for (let i = 0; i < tracks.length; i++) {
              if (activeSubtitle !== null && i === subtitles.findIndex(s => s.index === activeSubtitle)) {
                tracks[i].mode = 'showing';
              } else {
                tracks[i].mode = 'hidden';
              }
            }
          }
        }}
        autoPlay
      >
        {subtitles.map(sub => (
          <track
            key={sub.index}
            kind="subtitles"
            src={\`\${API_BASE}/subtitle?id=\${id}&index=\${sub.index}\`}
            srcLang={sub.language}
            label={sub.title || sub.language}
            default={activeSubtitle === sub.index}
          />
        ))}
      </video>`;
content = content.replace(oldVideo, newVideo);

// 6. Add Subtitles Button to Top-Right Controls
const oldTopRight = `              <div className="flex items-center space-x-6">
                <div className="relative">
                  <button 
                    onClick={() => setShowQualityMenu(!showQualityMenu)}`;

const newTopRight = `              <div className="flex items-center space-x-6">
                
                {/* Subtitles Menu */}
                {subtitles.length > 0 && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                      className={\`text-white hover:text-brand-red flex items-center space-x-2 transition \${activeSubtitle !== null ? 'text-brand-red' : ''}\`}
                    >
                      <MessageSquare size={24} />
                    </button>
                    
                    {showSubtitleMenu && (
                      <div className="absolute top-full right-0 mt-4 bg-gray-900 rounded-lg py-2 min-w-[150px] shadow-2xl border border-gray-800">
                        <button
                          onClick={() => { setActiveSubtitle(null); setShowSubtitleMenu(false); }}
                          className={\`block w-full text-left px-4 py-2 hover:bg-gray-800 transition \${activeSubtitle === null ? 'text-brand-red font-bold' : 'text-gray-200'}\`}
                        >
                          Off
                        </button>
                        {subtitles.map(sub => (
                          <button
                            key={sub.index}
                            onClick={() => { setActiveSubtitle(sub.index); setShowSubtitleMenu(false); }}
                            className={\`block w-full text-left px-4 py-2 hover:bg-gray-800 transition \${activeSubtitle === sub.index ? 'text-brand-red font-bold' : 'text-gray-200'}\`}
                          >
                            {sub.title || sub.language || \`Track \${sub.index}\`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="relative">
                  <button 
                    onClick={() => setShowQualityMenu(!showQualityMenu)}`;
content = content.replace(oldTopRight, newTopRight);

fs.writeFileSync(file, content);
