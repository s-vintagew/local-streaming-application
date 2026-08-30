import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Search, Tv, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const MediaCard = ({ media, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative w-full aspect-[2/3] cursor-pointer rounded-xl overflow-hidden shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05, zIndex: 10, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={() => onClick(media.id, media.type)}
    >
      <img
        src={media.posterPath || 'https://via.placeholder.com/500x750?text=No+Poster'}
        alt={media.title}
        className="w-full h-full object-cover transition-transform duration-500"
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <div className="absolute bottom-4 left-4 right-4">
        <h3 className="font-bold text-lg text-white drop-shadow-md line-clamp-2">{media.title}</h3>
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/90 flex flex-col justify-end p-4 md:p-6"
          >
            <h3 className="font-bold text-xl mb-1 text-white leading-tight">{media.title}</h3>
            {media.type === 'tv' && (
              <p className="text-sm text-brand-red font-semibold mb-2">{media.episodes?.length || 0} Episodes</p>
            )}
            
            <p className="text-xs text-gray-300 line-clamp-4 mb-4 leading-relaxed hidden sm:block">
              {media.overview || 'No overview available.'}
            </p>

            <div className="flex space-x-2 mt-auto">
              <button 
                className="flex-1 bg-white text-black py-2 rounded font-bold flex items-center justify-center space-x-1 hover:bg-gray-200 transition-colors text-sm"
                onClick={(e) => { e.stopPropagation(); onClick(media.id, media.type); }}
              >
                <Info size={16} />
                <span>Details</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function Home() {
  const [library, setLibrary] = useState({ movies: [], shows: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(sessionStorage.getItem('ag_activeTab') || 'movies');

  useEffect(() => {
    sessionStorage.setItem('ag_activeTab', activeTab);
  }, [activeTab]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await axios.get(`${API_BASE}/library`);
        setLibrary(res.data);
        if (res.data.movies.length === 0 && res.data.shows.length > 0) {
          setActiveTab('shows');
        }
      } catch (err) {
        console.error("Failed to fetch library", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, []);

  const handleCardClick = (id, type) => {
    navigate(`/details/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-red"></div>
      </div>
    );
  }

  const activeMedia = activeTab === 'movies' ? library.movies : library.shows;

  return (
    <div className="min-h-screen bg-brand-dark text-white pb-24 font-sans">
      <header className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-sm border-b border-gray-800 pt-4 pb-4 px-8 md:px-12 flex justify-between items-center">
        <div className="flex items-center space-x-12">
          <h1 className="text-3xl font-extrabold text-brand-red tracking-tight drop-shadow-lg cursor-pointer">VintageStream</h1>
          <nav className="hidden md:flex space-x-6">
            <button 
              onClick={() => setActiveTab('movies')}
              className={`flex items-center space-x-2 font-semibold transition-colors ${activeTab === 'movies' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Film size={20} /> <span>Movies</span>
            </button>
            <button 
              onClick={() => setActiveTab('shows')}
              className={`flex items-center space-x-2 font-semibold transition-colors ${activeTab === 'shows' ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Tv size={20} /> <span>TV Shows</span>
            </button>
          </nav>
        </div>
        <div className="flex items-center space-x-6">
          <a 
            href="https://www.themoviedb.org/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hidden sm:flex flex-col items-end text-[10px] text-gray-500 hover:text-gray-300 transition"
          >
            <span>Powered by</span>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#90cea1] to-[#01b4e4] text-xs">TMDB</span>
          </a>
          <Search size={24} className="cursor-pointer hover:text-gray-300 transition" />
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 w-full z-50 bg-black/95 border-t border-gray-800 flex justify-around py-4">
        <button 
          onClick={() => setActiveTab('movies')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'movies' ? 'text-white' : 'text-gray-500'}`}
        >
          <Film size={24} />
          <span className="text-xs font-semibold">Movies</span>
        </button>
        <button 
          onClick={() => setActiveTab('shows')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'shows' ? 'text-white' : 'text-gray-500'}`}
        >
          <Tv size={24} />
          <span className="text-xs font-semibold">Shows</span>
        </button>
      </div>

      <main className="pt-32 px-8 md:px-12 max-w-[2000px] mx-auto">
        {activeMedia.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
            {activeMedia.map(media => (
              <MediaCard key={media.id} media={media} onClick={handleCardClick} />
            ))}
          </div>
        ) : (
          <div className="mt-32 text-center max-w-lg mx-auto bg-gray-900/50 p-12 rounded-2xl border border-gray-800">
            <Search size={48} className="mx-auto text-gray-500 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">No {activeTab === 'movies' ? 'Movies' : 'TV Shows'} Found</h2>
            <p className="text-gray-400">
              We couldn't find any {activeTab === 'movies' ? 'movies' : 'TV shows'} in your library.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
