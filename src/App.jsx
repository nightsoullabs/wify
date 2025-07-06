import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useEffect, useCallback } from "react";
import { CameraWidget } from "./components/CameraWidget";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { ChatInput } from "./components/ChatInput";
import { Settings } from "./components/Settings";
import { YouTubePlayer } from "./components/YouTubePlayer";
import ChatService from "./services/ChatService";
import MusicAIService from "./services/MusicAIService";
import "./components/Chat.css";
import "./components/YouTubePlayer.css";

function App() {
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  const [aiProvider, setAiProvider] = useState("gemini");
  const [aiResponse, setAiResponse] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isYouTubeOpen, setIsYouTubeOpen] = useState(false);
  const [aiRequestedSongs, setAiRequestedSongs] = useState(null);
  const [autoPlaySong, setAutoPlaySong] = useState(null);
  const [lastMusicRequest, setLastMusicRequest] = useState(null);
  const [showClapIndicator, setShowClapIndicator] = useState(false);

  // Set default API keys on initial load
  useEffect(() => {
    const apiKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
    
    // Set default YouTube API key if not already set
    if (!apiKeys.youtube) {
      apiKeys.youtube = 'AIzaSyCQbR6x55TRiq6ygvN4z0w4dRRomeBN1Mk';
      localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
    }
  }, []);

  // Display welcome message on first load
  useEffect(() => {
    if (showWelcome) {
      setTimeout(() => {
        const welcomeMessage = {
          text: "Hi sweetheart! I'm here now. How can I brighten your day? 💕",
          type: "ai"
        };
        setMessages([welcomeMessage]);
        setShowWelcome(false);
      }, 1500);
    }
  }, [showWelcome]);

  // Process user message with AI and handle music requests
  const handleSendMessage = async (message) => {
    // Add user message to chat
    const userMessage = {
      text: message,
      type: "user"
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessingMessage(true);
    
    try {
      // First check if this is a song choice for a previous music request
      if (lastMusicRequest && aiRequestedSongs) {
        const songChoice = MusicAIService.extractSongChoice(message, aiRequestedSongs);
        
        if (songChoice.isChoice) {
          // User has selected a song from the previous list
          setAutoPlaySong(songChoice.selectedSong);
          setIsYouTubeOpen(true);
          
          const aiMessage = {
            text: `Great choice! I'll play "${songChoice.selectedSong.snippet.title}" for you now, darling! 💕`,
            type: "ai"
          };
          
          setMessages(prev => [...prev, aiMessage]);
          setIsProcessingMessage(false);
          return;
        }
      }
      
      // Check if it's a music request
      const musicAnalysis = await MusicAIService.analyzeMessage(message);
      
      if (musicAnalysis.isMusicRequest) {
        try {
          // Search for songs based on the request
          const searchResults = await MusicAIService.searchYouTube(musicAnalysis.searchQuery);
          setAiRequestedSongs(searchResults);
          
          // Format AI response about the found songs
          const response = MusicAIService.formatMusicResponse(musicAnalysis, searchResults);
          
          // Add AI response to chat
          const aiMessage = {
            text: response,
            type: "ai"
          };
          
          setMessages(prev => [...prev, aiMessage]);
          setLastMusicRequest(musicAnalysis);
          
          // Open YouTube player
          setIsYouTubeOpen(true);
          
          // Auto-play first song if requested
          if (musicAnalysis.autoPlay && searchResults.length > 0) {
            setAutoPlaySong(searchResults[0]);
          }
        } catch (error) {
          console.error("Music search error:", error);
          const errorResponse = await ChatService.processMessage(message, aiProvider);
          
          // Add AI response to chat
          const aiMessage = {
            text: errorResponse.text,
            type: "ai",
            error: errorResponse.error
          };
          
          setMessages(prev => [...prev, aiMessage]);
          setAiResponse(errorResponse);
        }
      } else {
        // Process regular message with AI
        const response = await ChatService.processMessage(message, aiProvider);
        
        // Add AI response to chat
        const aiMessage = {
          text: response.text,
          type: "ai",
          error: response.error
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setAiResponse(response);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      
      const errorMessage = {
        text: "Sorry darling, something went wrong. Can you try again?",
        type: "ai",
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setAiResponse({
        text: errorMessage.text,
        error: true
      });
    } finally {
      setIsProcessingMessage(false);
    }
  };

  // Handle song playback started
  const handlePlaybackStarted = (video) => {
    // Clear requested songs after playback starts
    setAiRequestedSongs(null);
    setAutoPlaySong(null);
  };

  const handleProviderChange = (provider) => {
    setAiProvider(provider);
  };

  // Function to render chat messages
  const renderChatMessages = () => {
    if (messages.length === 0) return null;
    
    // Only show the last message as a floating response
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.type === 'ai') {
      return (
        <div className={`floating-message ${lastMessage.error ? 'error' : ''}`}>
          <p>{lastMessage.text}</p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <>
      <UI />
      <CameraWidget />
      <Loader />
      <Canvas shadows camera={{ position: [0.25, 0.25, 2], fov: 30 }}>
        <color attach="background" args={["#333"]} />
        <fog attach="fog" args={["#333", 10, 20]} />
        {/* <Stats /> */}
        <Suspense>
          <Experience />
        </Suspense>
      </Canvas>

      {/* Chat Messages */}
      {renderChatMessages()}

      {/* Chat Input */}
      <div className="chat-container">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isProcessing={isProcessingMessage} 
        />
      </div>

      {/* Settings Button */}
      <div className="settings-container">
        <button className="settings-button" onClick={() => setIsSettingsOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>
      
      <Settings 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onProviderChange={handleProviderChange}
      />

      {/* Music Button */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 200 }}>
        <button 
          className="settings-button"
          onClick={() => setIsYouTubeOpen(true)}
          style={{ backgroundColor: 'rgba(255, 105, 180, 0.7)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </button>
      </div>

      <YouTubePlayer 
        isOpen={isYouTubeOpen}
        onClose={() => setIsYouTubeOpen(false)}
        aiRequestedSongs={aiRequestedSongs}
        autoPlaySong={autoPlaySong}
        onPlaybackStarted={handlePlaybackStarted}
      />
    </>
  );
}

export default App;