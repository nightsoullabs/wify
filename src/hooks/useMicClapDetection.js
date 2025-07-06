import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Enhanced hook for detecting claps using microphone audio analysis
 * @param {Function} onClapDetected - Callback function when clap is detected
 * @param {boolean} enabled - Whether the clap detection is enabled
 * @returns {Object} - State and control functions for mic clap detection
 */
export function useMicClapDetection(onClapDetected, enabled = true) {
  const [isListening, setIsListening] = useState(false);
  const [permission, setPermission] = useState(null);
  const [clapSensitivity, setClapSensitivity] = useState(0.7); // Adjustable sensitivity
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const previousVolumeRef = useRef(0);
  const volumeHistoryRef = useRef([]);
  const clapTimeoutRef = useRef(null);
  const lastClapTimeRef = useRef(0);
  const baselineVolumeRef = useRef(0);
  const calibrationSamplesRef = useRef([]);
  
  // Enhanced clap detection parameters
  const CLAP_COOLDOWN = 800; // Minimum time between claps (ms)
  const VOLUME_HISTORY_SIZE = 10; // Number of volume samples to keep
  const CALIBRATION_SAMPLES = 30; // Samples for baseline calibration
  const MIN_CLAP_RATIO = 2.5; // Minimum ratio above baseline for clap detection
  const SUDDEN_SPIKE_THRESHOLD = 25; // Minimum sudden volume increase
  
  // Initialize audio context and analyzer with enhanced settings
  const initAudio = useCallback(async () => {
    try {
      if (!enabled) return;
      
      console.log("🎤 Initializing enhanced clap detection...");
      
      // Request microphone permission with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });
      setPermission('granted');
      
      // Create audio context and analyzer with optimized settings
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      
      // Connect microphone to analyzer
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      // Configure analyzer for clap detection
      analyser.fftSize = 512; // Increased for better frequency resolution
      analyser.smoothingTimeConstant = 0.3; // Less smoothing for faster response
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      
      // Save references
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      micStreamRef.current = stream;
      
      setIsListening(true);
      
      // Start calibration and detection
      setTimeout(() => {
        calibrateBaseline();
        startEnhancedListening();
      }, 500);
      
      console.log("✅ Enhanced clap detection initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing microphone:", error);
      setPermission('denied');
      setIsListening(false);
    }
  }, [enabled]);
  
  // Calibrate baseline volume for better clap detection
  const calibrateBaseline = useCallback(() => {
    if (!analyserRef.current) return;
    
    console.log("🔧 Calibrating baseline volume...");
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const calibrate = () => {
      if (!analyserRef.current || calibrationSamplesRef.current.length >= CALIBRATION_SAMPLES) {
        // Calculate baseline from calibration samples
        const sum = calibrationSamplesRef.current.reduce((a, b) => a + b, 0);
        baselineVolumeRef.current = sum / calibrationSamplesRef.current.length;
        console.log(`📊 Baseline volume calibrated: ${baselineVolumeRef.current.toFixed(2)}`);
        return;
      }
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS volume for more accurate baseline
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rmsVolume = Math.sqrt(sum / bufferLength);
      
      calibrationSamplesRef.current.push(rmsVolume);
      
      setTimeout(calibrate, 50);
    };
    
    calibrate();
  }, []);
  
  // Enhanced clap detection algorithm
  const detectEnhancedClap = useCallback((currentVolume, frequencyData) => {
    const now = Date.now();
    const timeSinceLastClap = now - lastClapTimeRef.current;
    
    // Skip if too soon after last clap
    if (timeSinceLastClap < CLAP_COOLDOWN) return false;
    
    // Update volume history
    volumeHistoryRef.current.push(currentVolume);
    if (volumeHistoryRef.current.length > VOLUME_HISTORY_SIZE) {
      volumeHistoryRef.current.shift();
    }
    
    // Need enough history for comparison
    if (volumeHistoryRef.current.length < 3) return false;
    
    // Calculate average of recent volumes (excluding current)
    const recentAverage = volumeHistoryRef.current
      .slice(0, -1)
      .reduce((a, b) => a + b, 0) / (volumeHistoryRef.current.length - 1);
    
    // Detect sudden volume spike
    const volumeIncrease = currentVolume - recentAverage;
    const volumeRatio = baselineVolumeRef.current > 0 ? 
      currentVolume / baselineVolumeRef.current : 1;
    
    // Enhanced clap detection criteria
    const isSuddenSpike = volumeIncrease > SUDDEN_SPIKE_THRESHOLD;
    const isAboveBaseline = volumeRatio > MIN_CLAP_RATIO;
    const isSignificantVolume = currentVolume > 30; // Minimum absolute volume
    
    // Analyze frequency characteristics for clap-like sounds
    const highFreqEnergy = calculateHighFrequencyEnergy(frequencyData);
    const isClappyFrequency = highFreqEnergy > 0.3; // Claps have high-frequency content
    
    // Final clap detection decision
    const isClap = isSuddenSpike && isAboveBaseline && isSignificantVolume && isClappyFrequency;
    
    if (isClap) {
      console.log(`👏 CLAP DETECTED! Volume: ${currentVolume.toFixed(1)}, Increase: ${volumeIncrease.toFixed(1)}, Ratio: ${volumeRatio.toFixed(2)}, HF Energy: ${highFreqEnergy.toFixed(2)}`);
      lastClapTimeRef.current = now;
      return true;
    }
    
    return false;
  }, []);
  
  // Calculate high-frequency energy for clap detection
  const calculateHighFrequencyEnergy = useCallback((frequencyData) => {
    const totalBins = frequencyData.length;
    const highFreqStart = Math.floor(totalBins * 0.6); // Upper 40% of frequency range
    
    let highFreqSum = 0;
    let totalSum = 0;
    
    for (let i = 0; i < totalBins; i++) {
      totalSum += frequencyData[i];
      if (i >= highFreqStart) {
        highFreqSum += frequencyData[i];
      }
    }
    
    return totalSum > 0 ? highFreqSum / totalSum : 0;
  }, []);
  
  // Enhanced listening loop with improved clap detection
  const startEnhancedListening = useCallback(() => {
    if (!analyserRef.current || !enabled) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(analyserRef.current.fftSize);
    
    const detectLoop = () => {
      if (!analyserRef.current || !isListening) return;
      
      // Get both frequency and time domain data
      analyserRef.current.getByteFrequencyData(frequencyData);
      analyserRef.current.getByteTimeDomainData(timeData);
      
      // Calculate RMS volume for more accurate detection
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        const sample = (timeData[i] - 128) / 128; // Normalize to -1 to 1
        sum += sample * sample;
      }
      const rmsVolume = Math.sqrt(sum / timeData.length) * 100;
      
      // Enhanced clap detection
      if (detectEnhancedClap(rmsVolume, frequencyData)) {
        // Visual and audio feedback
        showClapFeedback();
        
        // Trigger callback
        if (onClapDetected && typeof onClapDetected === 'function') {
          console.log("🎯 Activating microphone via clap detection!");
          onClapDetected();
        }
      }
      
      previousVolumeRef.current = rmsVolume;
      
      // Continue detection loop
      if (isListening) {
        requestAnimationFrame(detectLoop);
      }
    };
    
    detectLoop();
  }, [enabled, isListening, onClapDetected, detectEnhancedClap]);
  
  // Visual feedback for clap detection
  const showClapFeedback = useCallback(() => {
    // Create visual indicator
    const indicator = document.createElement('div');
    indicator.className = 'clap-detected';
    indicator.innerHTML = '👏';
    indicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(255, 215, 0, 0.9);
      border-radius: 50%;
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-size: 30px;
      animation: clapPulse 0.8s ease-out;
      pointer-events: none;
    `;
    
    document.body.appendChild(indicator);
    
    // Remove after animation
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 800);
    
    // Play audio feedback if available
    try {
      const audio = new Audio('/assets/sounds/clap-detected.mp3');
      audio.volume = 0.3;
      audio.play().catch(err => console.warn("Couldn't play clap sound:", err));
    } catch (err) {
      console.warn("Error with clap sound:", err);
    }
  }, []);
  
  // Clean up audio resources
  const cleanupAudio = useCallback(() => {
    console.log("🧹 Cleaning up clap detection...");
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    volumeHistoryRef.current = [];
    calibrationSamplesRef.current = [];
    setIsListening(false);
  }, []);
  
  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (isListening) {
      cleanupAudio();
    } else {
      initAudio();
    }
  }, [isListening, cleanupAudio, initAudio]);
  
  // Adjust sensitivity
  const adjustSensitivity = useCallback((newSensitivity) => {
    setClapSensitivity(Math.max(0.1, Math.min(1.0, newSensitivity)));
    console.log(`🔧 Clap sensitivity adjusted to: ${newSensitivity}`);
  }, []);
  
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
    toggleListening,
    adjustSensitivity,
    clapSensitivity
  };
}