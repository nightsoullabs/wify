import { useState, useEffect, useCallback } from 'react';
import { useVideoRecognition } from './useVideoRecognition';
import clapDetector from 'clap-detector';

// Clap detection threshold and cooldown settings
const CLAP_VELOCITY_THRESHOLD = 0.2;
const COOLDOWN_PERIOD = 1000; // milliseconds

export const useClapDetection = (onClapDetected) => {
  const [lastClapTime, setLastClapTime] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);
  const [clapDetectorInitialized, setClapDetectorInitialized] = useState(false);
  
  // Initialize clap detector library
  useEffect(() => {
    if (!clapDetectorInitialized && isEnabled) {
      // Configure and start clap detector
      clapDetector.configure({
        AUDIO_CONTEXT: window.AudioContext || window.webkitAudioContext,
        SAMPLE_RATE: 44100,
        FFT_SIZE: 1024,
        THRESHOLD: 0.6,
        CLAP_DELAY: 400
      });
      
      // Add clap event listener
      clapDetector.onClap(function() {
        const now = Date.now();
        if (now - lastClapTime > COOLDOWN_PERIOD) {
          console.log("👏 Clap detected by clap-detector library!");
          setLastClapTime(now);
          onClapDetected && onClapDetected();
        }
      });
      
      // Start clap detection
      clapDetector.start();
      setClapDetectorInitialized(true);
      
      console.log("Clap detector initialized");
    }
    
    // Cleanup when component unmounts
    return () => {
      if (clapDetectorInitialized) {
        clapDetector.stop();
        console.log("Clap detector stopped");
      }
    };
  }, [isEnabled, lastClapTime, onClapDetected, clapDetectorInitialized]);
  
  // Function to analyze hand movements for clap gestures (as a backup method)
  const detectClap = useCallback((results) => {
    if (!isEnabled || !results) return;
    
    const leftHand = results.leftHandLandmarks;
    const rightHand = results.rightHandLandmarks;
    
    // Only proceed if both hands are visible
    if (!leftHand || !rightHand) return;
    
    // Calculate the distance between hands (using wrist points)
    const leftWrist = leftHand[0];  // Wrist point
    const rightWrist = rightHand[0]; // Wrist point
    
    if (!leftWrist || !rightWrist) return;
    
    // Calculate distance between hands
    const distance = Math.sqrt(
      Math.pow(leftWrist.x - rightWrist.x, 2) + 
      Math.pow(leftWrist.y - rightWrist.y, 2)
    );
    
    // Detect clap based on hand distance and velocity
    const now = Date.now();
    
    // Hands are close together and it's been enough time since last clap
    if (distance < CLAP_VELOCITY_THRESHOLD && now - lastClapTime > COOLDOWN_PERIOD) {
      setLastClapTime(now);
      onClapDetected && onClapDetected();
      
      // Visual feedback in the console for debugging
      console.log("👏 Clap detected through video recognition!");
    }
  }, [isEnabled, lastClapTime, onClapDetected]);
  
  // Register the clap detection callback with the video recognition system
  useEffect(() => {
    const prevCallback = useVideoRecognition.getState().resultsCallback;
    
    const combinedCallback = (results) => {
      // Call the existing callback if there is one
      if (prevCallback) prevCallback(results);
      
      // Also process for clap detection
      detectClap(results);
    };
    
    useVideoRecognition.getState().setResultsCallback(combinedCallback);
    
    return () => {
      // Restore previous callback when component unmounts
      useVideoRecognition.getState().setResultsCallback(prevCallback);
    };
  }, [detectClap]);
  
  return {
    isEnabled,
    setIsEnabled
  };
};