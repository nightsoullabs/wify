import { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaHeart, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { useMicClapDetection } from '../hooks/useMicClapDetection';

export const ChatInput = ({ onSendMessage, isProcessing }) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(false);
  const [showMicFeedback, setShowMicFeedback] = useState(false);
  const autoSubmitTimeoutRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  
  // Enhanced microphone clap detection handler - always enabled
  const handleMicClapDetected = () => {
    console.log("🎯 Enhanced microphone clap detected!");
    
    if (!isProcessing && !isListening && hasVoiceSupport) {
      // Show enhanced visual feedback
      setShowMicFeedback(true);
      setTimeout(() => setShowMicFeedback(false), 1000);
      
      // Add screen flash effect
      const flashOverlay = document.createElement('div');
      flashOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 215, 0, 0.3);
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
        console.log("🎤 Activating voice input via clap...");
        toggleVoiceInput();
        
        // Play enhanced feedback sound
        try {
          const audio = new Audio('/assets/sounds/activate.mp3');
          audio.volume = 0.6;
          audio.play().catch(err => console.warn("Couldn't play activation sound:", err));
        } catch (err) {
          console.warn("Error with activation sound:", err);
        }
      }, 200);
    } else {
      console.log("⚠️ Clap detected but conditions not met:", {
        isProcessing,
        isListening,
        hasVoiceSupport
      });
    }
  };
  
  // Use enhanced microphone clap detection - always enabled
  const { 
    isListening: isClapListening, 
    permission: clapPermission,
    adjustSensitivity,
    clapSensitivity 
  } = useMicClapDetection(handleMicClapDetected, true); // Always enabled

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

  const toggleVoiceInput = () => {
    if (!hasVoiceSupport) {
      console.warn("⚠️ Voice input not supported");
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (isListening) {
      // Stop listening
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
        speechRecognitionRef.current = null;
      }
      setIsListening(false);
      console.log("🛑 Voice input stopped");
    } else {
      // Start listening
      console.log("🎤 Starting voice input...");
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log("✅ Voice recognition started");
        setIsListening(true);
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
        } else {
          setMessage(transcript);
        }
        
        // Check if this is a final result
        const isFinal = event.results[0].isFinal;
        
        if (isFinal) {
          console.log("✅ Final voice result received");
          
          // Clear any existing timeout
          if (autoSubmitTimeoutRef.current) {
            clearTimeout(autoSubmitTimeoutRef.current);
          }
          
          // Auto-submit voice input after recognition is final
          autoSubmitTimeoutRef.current = setTimeout(() => {
            const finalMessage = lowerTranscript.includes('wify') || lowerTranscript.includes('wifi') 
              ? transcript.replace(/wify|wifi/gi, '').trim() || transcript
              : transcript;
              
            if (finalMessage.trim()) {
              console.log("📤 Auto-submitting voice message:", finalMessage);
              onSendMessage(finalMessage);
              setMessage('');
            }
          }, 500);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        setIsListening(false);
        speechRecognitionRef.current = null;
        
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
      };
      
      speechRecognitionRef.current = recognition;
      recognition.start();
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
          placeholder="👏 Double clap or say 'Wify' to activate voice, or type here..."
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
            className={`voice-button ${isListening ? 'listening' : ''} ${showMicFeedback ? 'clap-activated' : ''}`}
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
      
      {/* Clap Detection Status - subtle indicator */}
      <div style={{
        position: 'absolute',
        bottom: '-20px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '9px',
        color: isClapListening ? '#4ade80' : '#ef4444',
        opacity: 0.5
      }}>
        {isClapListening ? '👏 Clap detection active' : '❌ Clap detection inactive'}
      </div>
    </div>
  );
};