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
  
  // Handle microphone clap detection for activating voice input
  const handleMicClapDetected = () => {
    console.log("Microphone clap detected!");
    
    if (!isProcessing && !isListening) {
      // Show visual feedback
      setShowMicFeedback(true);
      setTimeout(() => setShowMicFeedback(false), 800);
      
      // Toggle voice recognition after a short delay
      setTimeout(() => {
        toggleVoiceInput();
        
        // Play a sound effect for clap detection feedback
        try {
          const audio = new Audio('/assets/sounds/clap-detected.mp3');
          audio.volume = 0.5;
          audio.play().catch(err => console.warn("Couldn't play clap sound:", err));
        } catch (err) {
          console.warn("Error with clap sound:", err);
        }
      }, 300);
    }
  };
  
  // Use our custom hook for microphone clap detection - always enabled now
  const { isListening: isMicClapListening } = useMicClapDetection(handleMicClapDetected, true);

  // Check if browser supports speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setHasVoiceSupport(!!SpeechRecognition);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isProcessing) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const toggleVoiceInput = () => {
    if (!hasVoiceSupport) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (isListening) {
      // Stop listening
      window.speechRecognition?.stop();
      setIsListening(false);
    } else {
      // Start listening
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setMessage(transcript);
        
        // Check if this is a final result
        const isFinal = event.results[0].isFinal;
        
        if (isFinal) {
          // Play activation sound for feedback
          try {
            const audio = new Audio('/assets/sounds/activate.mp3');
            audio.volume = 0.5;
            audio.play().catch(err => console.warn("Couldn't play activation sound:", err));
          } catch (err) {
            console.warn("Error with activation sound:", err);
          }
          
          // Clear any existing timeout
          if (autoSubmitTimeoutRef.current) {
            clearTimeout(autoSubmitTimeoutRef.current);
          }
          
          // Always auto-submit voice input after recognition is final
          autoSubmitTimeoutRef.current = setTimeout(() => {
            if (transcript.trim()) {
              onSendMessage(transcript);
              setMessage('');
            }
          }, 300); // Shorter delay for faster response
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      window.speechRecognition = recognition;
      recognition.start();
      setIsListening(true);
    }
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
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
          placeholder="Talk to me, honey..."
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
    </div>
  );
};