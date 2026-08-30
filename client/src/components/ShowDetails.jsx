import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Play, ArrowLeft, Download } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const STREAM_BASE = import.meta.env.VITE_STREAM_BASE || '/stream';

export default function ShowDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await axios.get(`${API_BASE}/library`);
        const foundShow = res.data.shows.find(s => s.id === id);
        const foundMovie = res.data.movies.find(m => m.id === id);
        setMedia(foundShow || foundMovie);
      } catch (err) {
        console.error("Failed to fetch library", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-red"></div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-4">Media not found</h2>
        <button onClick={() => navigate('/')} className="text-brand-red hover:underline">Return to Home</button>
      </div>
    );
  }

  const isMovie = media.type === 'movie';
  let seasons = {};
  let seasonNumbers = [];

  if (!isMovie) {
    // Group episodes by season
    seasons = media.episodes.reduce((acc, ep) => {
      if (!acc[ep.season]) acc[ep.season] = [];
      acc[ep.season].push(ep);
      return acc;
    }, {});
    seasonNumbers = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));
  }

  return (
    <div className="min-h-screen bg-brand-dark text-white font-sans pb-24">
      {/* Banner */}
      <div className="relative w-full h-[60vh] md:h-[75vh] lg:h-[85vh] bg-black overflow-hidden">
        <img 
          src={media.backdropPath || media.posterPath || 'https://via.placeholder.com/1920x1080?text=No+Backdrop'} 
          className="w-full h-full object-cover opacity-50"
          alt={media.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent pointer-events-none" />
        
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-8 left-8 md:top-12 md:left-12 flex items-center space-x-2 text-gray-300 hover:text-white transition bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-gray-700 hover:bg-black/60 z-50 pointer-events-auto"
        >
          <ArrowLeft size={20} />
          <span className="font-semibold">Back</span>
        </button>

        <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full max-w-4xl z-40 pointer-events-none">
          <div className="pointer-events-auto inline-block">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-lg">{media.title}</h1>
            <div className="flex items-center space-x-4 mb-6 text-sm font-semibold text-gray-300">
              <span className="bg-brand-red text-white px-2 py-1 rounded">{isMovie ? 'Movie' : 'TV Series'}</span>
              {!isMovie && <span>{seasonNumbers.length} Seasons</span>}
              {media.voteAverage && <span>⭐ {media.voteAverage.toFixed(1)}</span>}
            </div>
          </div>
          <p className="text-lg text-gray-200 leading-relaxed drop-shadow max-w-3xl line-clamp-4 mb-8 pointer-events-auto">
            {media.overview || 'No overview available.'}
          </p>

          {isMovie && (
            <div className="flex items-center space-x-4 pointer-events-auto">
              <button 
                onClick={() => navigate(`/play/${media.id}`)}
                className="flex items-center space-x-2 bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors"
              >
                <Play size={20} fill="currentColor" />
                <span>Play Now</span>
              </button>
              
              <a 
                href={`${STREAM_BASE}?id=${media.id}&quality=original&download=true`}
                download
                className="flex items-center space-x-2 bg-gray-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-700 transition-colors border border-gray-700"
              >
                <Download size={20} />
                <span>Download</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Episodes List (Only for TV Shows) */}
      {!isMovie && (
        <div className="px-8 md:px-12 mt-8 max-w-6xl mx-auto">
          {seasonNumbers.map(snum => (
            <div key={snum} className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-gray-100 flex items-center">
                Season {snum}
                <span className="ml-4 flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent"></span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {seasons[snum].map(ep => (
                  <div 
                    key={ep.id}
                    onClick={() => navigate(`/play/${ep.id}`)}
                    className="bg-gray-900 rounded-lg p-4 cursor-pointer hover:bg-gray-800 transition-colors border border-gray-800 hover:border-gray-600 flex items-center justify-between group relative overflow-hidden"
                  >
                    <div className="flex flex-col z-10 w-full pr-12">
                      <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Episode {ep.episode}</span>
                      <span className="text-gray-100 font-medium truncate w-full" title={ep.originalTitle}>
                        {ep.title || ep.originalTitle || `Episode ${ep.episode}`}
                      </span>
                    </div>
                    
                    <div className="absolute right-4 flex space-x-2 z-20">
                      <a 
                        href={`${STREAM_BASE}?id=${ep.id}&quality=original&download=true`}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 h-10 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center hover:bg-brand-red hover:text-white transition-colors shadow-sm"
                        title="Download Episode"
                      >
                        <Download size={18} />
                      </a>
                      <div className="w-10 h-10 rounded-full bg-brand-red/10 text-brand-red flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-colors">
                        <Play size={18} className="ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
