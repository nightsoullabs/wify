import { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaHeart, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { useMicClapDetection } from '../hooks/useMicClapDetection';

export const ChatInput = ({ onSendMessage, isProcessing }) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  const [showVoiceFeedback, setShowVoiceFeedback] = useState(false);
  const autoSubmitTimeoutRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const continuousListeningRef = useRef(false);
  
  // Enhanced clap detection handler for wake functionality
  const handleClapWake = () => {
    console.log("🎯 Clap wake detected!");
    
    if (!isProcessing && hasVoiceSupport) {
      // Show visual feedback
      setShowVoiceFeedback(true);
      setTimeout(() => setShowVoiceFeedback(false), 1000);
      
      // Add screen flash effect
      const flashOverlay = document.createElement('div');
      flashOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(100, 149, 237, 0.3);
        z-index: 9998;
        pointer-events: none;
        animation: flashFade 0.5s ease-out;
      `;
      
      document.body.appendChild(flashOverlay);
      setTimeout(() => {
        if (flashOverlay.parentNode) {
          flashOverlay.parentNode.removeChild(flashOverlay);
        }
      }, 500);
      
      // Activate voice recognition after a short delay
      setTimeout(() => {
        console.log("🎤 Activating voice input via clap wake...");
        startVoiceInput();
        
        // Play feedback sound
        try {
          const audio = new Audio('/assets/sounds/activate.mp3');
          audio.volume = 0.6;
          audio.play().catch(err => console.warn("Couldn't play activation sound:", err));
        } catch (err) {
          console.warn("Error with activation sound:", err);
        }
      }, 200);
    }
  };
  
  // Use clap detection for wake functionality
  const { 
    isListening: isClapListening, 
    permission: clapPermission 
  } = useMicClapDetection(handleClapWake, true);

  // Check if browser supports speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setHasVoiceSupport(!!SpeechRecognition);
    
    if (!SpeechRecognition) {
      console.warn("⚠️ Speech recognition not supported in this browser");
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isProcessing) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const startVoiceInput = () => {
    if (!hasVoiceSupport) {
      console.warn("⚠️ Voice input not supported");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    console.log("🎤 Starting voice input...");
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Enable continuous listening
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      console.log("✅ Voice recognition started");
      setIsListening(true);
      continuousListeningRef.current = true;
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      console.log("📝 Voice transcript:", transcript);
      
      // Check for "Wify" wake word
      const lowerTranscript = transcript.toLowerCase();
      if (lowerTranscript.includes('wify') || lowerTranscript.includes('wifi')) {
        console.log("🎯 Wify wake word detected!");
        
        // Remove wake word from message and clean it up
        let cleanedMessage = transcript
          .replace(/wify|wifi/gi, '')
          .trim();
        
        // If there's content after the wake word, use it
        if (cleanedMessage) {
          setMessage(cleanedMessage);
        } else {
          setMessage(transcript); // Keep original if no content after wake word
        }
        
        // Auto-submit when Wify wake word is detected
        if (cleanedMessage.trim()) {
          console.log("📤 Auto-submitting Wify command:", cleanedMessage);
          onSendMessage(cleanedMessage);
          setMessage('');
          
          // Stop listening after processing Wify command
          if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
          }
        }
      } else {
        setMessage(transcript);
      }
      
      // Check if this is a final result for non-Wify commands
      const isFinal = event.results[0].isFinal;
      
      if (isFinal && !lowerTranscript.includes('wify') && !lowerTranscript.includes('wifi')) {
        console.log("✅ Final voice result received");
        
        // Clear any existing timeout
        if (autoSubmitTimeoutRef.current) {
          clearTimeout(autoSubmitTimeoutRef.current);
        }
        
        // Auto-submit voice input after recognition is final
        autoSubmitTimeoutRef.current = setTimeout(() => {
          if (transcript.trim()) {
            console.log("📤 Auto-submitting voice message:", transcript);
            onSendMessage(transcript);
            setMessage('');
            
            // Stop listening after processing command
            if (speechRecognitionRef.current) {
              speechRecognitionRef.current.stop();
            }
          }
        }, 1000);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      setIsListening(false);
      speechRecognitionRef.current = null;
      continuousListeningRef.current = false;
      
      // Show user-friendly error message
      if (event.error === 'no-speech') {
        console.log("ℹ️ No speech detected, try speaking louder");
      } else if (event.error === 'network') {
        console.log("⚠️ Network error, check your connection");
      }
    };
    
    recognition.onend = () => {
      console.log("🏁 Voice recognition ended");
      setIsListening(false);
      speechRecognitionRef.current = null;
      continuousListeningRef.current = false;
    };
    
    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceInput = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
    setIsListening(false);
    continuousListeningRef.current = false;
    console.log("🛑 Voice input stopped");
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  // Clean up timeouts and speech recognition on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className={`chat-input-container ${isFocused ? 'focused' : ''}`}>
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="👏 Clap to wake or say 'Wify' for hands-free, or type here..."
          disabled={isProcessing}
          className="chat-input"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        
        {/* Voice Input Button */}
        {hasVoiceSupport && (
          <button 
            type="button"
            onClick={toggleVoiceInput}
            disabled={isProcessing}
            className={`voice-button ${isListening ? 'listening' : ''} ${showVoiceFeedback ? 'clap-activated' : ''}`}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            title={isListening ? "Click to stop voice input" : "Click to start voice input"}
          >
            {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
          </button>
        )}
        
        {/* Send Button */}
        <button 
          type="submit" 
          disabled={!message.trim() || isProcessing}
          className="send-button"
          aria-label="Send message"
        >
          {isProcessing ? <FaHeart /> : <FaPaperPlane />}
        </button>
      </form>
      
      {/* Wake Detection Status */}
      <div style={{
        position: 'absolute',
        bottom: '-20px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '9px',
        color: isClapListening ? '#4ade80' : '#ef4444',
        opacity: 0.5
      }}>
        {isClapListening ? '🎯 Wake detection active' : '❌ Wake detection inactive'}
      </div>
    </div>
  );
};