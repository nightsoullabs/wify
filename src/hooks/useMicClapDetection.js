import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for detecting claps using microphone audio analysis
 * @param {Function} onClapDetected - Callback function when clap is detected
 * @param {boolean} enabled - Whether the clap detection is enabled
 * @returns {Object} - State and control functions for mic clap detection
 */
export function useMicClapDetection(onClapDetected, enabled = true) {
  const [isListening, setIsListening] = useState(false);
  const [permission, setPermission] = useState(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const previousVolumeRef = useRef(0);
  const clapTimeoutRef = useRef(null);
  const consecutiveClapCountRef = useRef(0);
  const lastClapTimeRef = useRef(0);
  
  // Initialize audio context and analyzer
  const initAudio = useCallback(async () => {
    try {
      if (!enabled) return;
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermission('granted');
      
      // Create audio context and analyzer
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      
      // Connect microphone to analyzer
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      // Configure analyzer
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      // Save references
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      micStreamRef.current = stream;
      
      setIsListening(true);
      startListening();
    } catch (error) {
      console.error("Error initializing microphone:", error);
      setPermission('denied');
      setIsListening(false);
    }
  }, [enabled]);
  
  // Clean up audio resources
  const cleanupAudio = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setIsListening(false);
  }, []);
  
  // Start listening for claps
  const startListening = useCallback(() => {
    if (!analyserRef.current || !enabled) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Function to detect claps
    const detectClap = () => {
      if (!analyserRef.current || !isListening) return;
      
      // Get frequency data
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const averageVolume = sum / bufferLength;
      
      // Detect sudden volume increase (clap)
      const volumeIncrease = averageVolume - previousVolumeRef.current;
      const now = Date.now();
      
      // SUPER sensitive detection - make it pick up almost any sound
      // Check if volume increase exceeds threshold and is not too close to previous clap
      if (volumeIncrease > 5 && averageVolume > 15) {
        const timeSinceLastClap = now - lastClapTimeRef.current;
        
        // If this is a new sound (not an echo)
        if (timeSinceLastClap > 150) {
          console.log("Sound detected!", averageVolume, volumeIncrease);
          
          // For testing, let's make ANY sudden noise trigger the action
          // This will make it easier to test, then we can fine-tune later
          if (onClapDetected && typeof onClapDetected === 'function') {
            console.log("ACTIVATING MIC");
            onClapDetected();
          }
          
          lastClapTimeRef.current = now;
          
          // Reset consecutive clap count after a delay
          if (clapTimeoutRef.current) {
            clearTimeout(clapTimeoutRef.current);
          }
          
          clapTimeoutRef.current = setTimeout(() => {
            consecutiveClapCountRef.current = 0;
          }, 1000); // Reset counter after 1 second if no second clap
        }
      }
      
      previousVolumeRef.current = averageVolume;
      
      // Continue detecting
      if (isListening) {
        requestAnimationFrame(detectClap);
      }
    };
    
    // Start detection loop
    detectClap();
  }, [enabled, isListening, onClapDetected]);
  
  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (isListening) {
      cleanupAudio();
    } else {
      initAudio();
    }
  }, [isListening, cleanupAudio, initAudio]);
  
  // Initialize on mount if enabled
  useEffect(() => {
    if (enabled) {
      initAudio();
    }
    
    // Clean up on unmount
    return () => {
      if (clapTimeoutRef.current) {
        clearTimeout(clapTimeoutRef.current);
      }
      cleanupAudio();
    };
  }, [enabled, initAudio, cleanupAudio]);
  
  return {
    isListening,
    permission,
    toggleListening
  };
}