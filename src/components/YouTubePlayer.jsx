import { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaVolumeMute, FaVolumeUp, FaTimes, FaSearch, FaGripLines } from 'react-icons/fa';
import MusicAIService from '../services/MusicAIService';

export const YouTubePlayer = ({ isOpen, onClose, aiRequestedSongs = null, autoPlaySong = null, onPlaybackStarted = () => {} }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [resultDragging, setResultDragging] = useState({ isDragging: false, index: null });
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0 });

  // YouTube API instance
  const [ytPlayer, setYtPlayer] = useState(null);

  // Check for AI requested songs
  useEffect(() => {
    if (aiRequestedSongs && aiRequestedSongs.length > 0) {
      setSearchResults(aiRequestedSongs);
      
      // If autoPlaySong is provided, play it automatically
      if (autoPlaySong) {
        selectVideo(autoPlaySong);
      }
    }
  }, [aiRequestedSongs, autoPlaySong]);

  const searchYouTube = async (query) => {
    const apiKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
    const youtubeApiKey = apiKeys.youtube || 'AIzaSyCQbR6x55TRiq6ygvN4z0w4dRRomeBN1Mk';

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${youtubeApiKey}`
      );
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      setSearchResults(data.items || []);
    } catch (error) {
      console.error('YouTube search error:', error);
      alert('Error searching YouTube: ' + error.message);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchYouTube(searchQuery);
    }
  };

  const selectVideo = (video) => {
    setCurrentVideo(video);
    setIsPlaying(true);
    onPlaybackStarted(video); // Notify when a song starts playing
  };

  const togglePlay = () => {
    if (ytPlayer) {
      if (isPlaying) {
        ytPlayer.pauseVideo();
      } else {
        ytPlayer.playVideo();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (ytPlayer) {
      if (isMuted) {
        ytPlayer.unMute();
      } else {
        ytPlayer.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  // Player window dragging handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Result item dragging handlers
  const handleResultDragStart = (e, index) => {
    e.preventDefault();
    setResultDragging({ isDragging: true, index });
  };

  const handleResultDragEnd = () => {
    if (resultDragging.isDragging && resultDragging.index !== null) {
      selectVideo(searchResults[resultDragging.index]);
    }
    setResultDragging({ isDragging: false, index: null });
  };

  const handleResultDragMove = (e) => {
    if (resultDragging.isDragging) {
      // You could implement visual drag effects here
    }
  };

  // Window dragging effect
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Result dragging effect
  useEffect(() => {
    if (resultDragging.isDragging) {
      document.addEventListener('mousemove', handleResultDragMove);
      document.addEventListener('mouseup', handleResultDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleResultDragMove);
        document.removeEventListener('mouseup', handleResultDragEnd);
      };
    }
  }, [resultDragging.isDragging, resultDragging.index, searchResults]);

  // YouTube API initialization
  useEffect(() => {
    // Load the YouTube API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API Ready');
      };
      
      document.body.appendChild(tag);
    }
  }, []);

  // Initialize player when current video changes
  useEffect(() => {
    if (currentVideo && window.YT && window.YT.Player) {
      // Clean up previous player
      if (ytPlayer) {
        ytPlayer.destroy();
      }
      
      // Create new player
      const newPlayer = new window.YT.Player('youtube-iframe-container', {
        height: '180',
        width: '320',
        videoId: currentVideo.id.videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            event.target.playVideo();
            setIsPlaying(true);
          },
          onStateChange: (event) => {
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
          }
        }
      });
      
      setYtPlayer(newPlayer);
    }
  }, [currentVideo]);

  if (!isOpen) return null;

  return (
    <div 
      className="youtube-player"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px` 
      }}
    >
      <div 
        className="youtube-header"
        onMouseDown={handleMouseDown}
      >
        <span>🎵 Music Player</span>
        <button onClick={onClose} className="youtube-close">
          <FaTimes />
        </button>
      </div>

      <div className="youtube-content">
        {!currentVideo ? (
          <>
            <form onSubmit={handleSearch} className="youtube-search">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for music..."
                className="youtube-search-input"
              />
              <button type="submit" className="youtube-search-btn">
                <FaSearch />
              </button>
            </form>

            <div className="youtube-results">
              {searchResults.map((video, index) => (
                <div
                  key={video.id.videoId}
                  className={`youtube-result ${resultDragging.isDragging && resultDragging.index === index ? 'dragging' : ''}`}
                  onClick={() => selectVideo(video)}
                >
                  <div 
                    className="youtube-result-drag-handle" 
                    onMouseDown={(e) => handleResultDragStart(e, index)}
                  >
                    <FaGripLines />
                  </div>
                  <img
                    src={video.snippet.thumbnails.default.url}
                    alt={video.snippet.title}
                    className="youtube-thumbnail"
                  />
                  <div className="youtube-info">
                    <h4>{video.snippet.title}</h4>
                    <p>{video.snippet.channelTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="youtube-player-container">
            <div id="youtube-iframe-container"></div>
            
            <div className="youtube-controls">
              <button onClick={togglePlay} className="youtube-control-btn">
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>
              <button onClick={toggleMute} className="youtube-control-btn">
                {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
              </button>
              <button 
                onClick={() => {
                  if (ytPlayer) {
                    ytPlayer.destroy();
                    setYtPlayer(null);
                  }
                  setCurrentVideo(null);
                }} 
                className="youtube-control-btn youtube-back"
              >
                ← Back
              </button>
            </div>

            <div className="youtube-current-info">
              <h4>{currentVideo.snippet.title}</h4>
              <p>{currentVideo.snippet.channelTitle}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};