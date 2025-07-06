import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Enhanced hook for detecting claps for wake functionality
 * @param {Function} onClapDetected - Callback function when clap wake is detected
 * @param {boolean} enabled - Whether the clap detection is enabled
 * @returns {Object} - State and control functions for mic clap detection
 */
export function useMicClapDetection(onClapDetected, enabled = true) {
  const [isListening, setIsListening] = useState(false);
  const [permission, setPermission] = useState(null);
  const [clapSensitivity, setClapSensitivity] = useState(0.6);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const previousVolumeRef = useRef(0);
  const volumeHistoryRef = useRef([]);
  const clapTimeoutRef = useRef(null);
  const lastClapTimeRef = useRef(0);
  const baselineVolumeRef = useRef(0);
  const calibrationSamplesRef = useRef([]);
  const clapSequenceRef = useRef([]);
  
  // Enhanced clap wake detection parameters
  const CLAP_COOLDOWN = 250; // Minimum time between individual claps (ms)
  const WAKE_CLAP_WINDOW = 600; // Maximum time between claps for wake (ms)
  const VOLUME_HISTORY_SIZE = 6;
  const CALIBRATION_SAMPLES = 20;
  const MIN_CLAP_RATIO = 2.0;
  const SUDDEN_SPIKE_THRESHOLD = 18;
  const WAKE_COOLDOWN = 2000; // Cooldown between wake activations (ms)
  
  // Initialize audio context and analyzer
  const initAudio = useCallback(async () => {
    try {
      if (!enabled) return;
      
      console.log("🎤 Initializing clap wake detection...");
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });
      setPermission('granted');
      
      // Create audio context and analyzer
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      
      // Connect microphone to analyzer
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      // Configure analyzer for clap detection
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.2;
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
        startWakeListening();
      }, 500);
      
      console.log("✅ Clap wake detection initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing microphone:", error);
      setPermission('denied');
      setIsListening(false);
    }
  }, [enabled]);
  
  // Calibrate baseline volume
  const calibrateBaseline = useCallback(() => {
    if (!analyserRef.current) return;
    
    console.log("🔧 Calibrating baseline volume...");
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const calibrate = () => {
      if (!analyserRef.current || calibrationSamplesRef.current.length >= CALIBRATION_SAMPLES) {
        const sum = calibrationSamplesRef.current.reduce((a, b) => a + b, 0);
        baselineVolumeRef.current = sum / calibrationSamplesRef.current.length;
        console.log(`📊 Baseline volume calibrated: ${baselineVolumeRef.current.toFixed(2)}`);
        return;
      }
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
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
  
  // Enhanced clap wake detection algorithm
  const detectClapWake = useCallback((currentVolume, frequencyData) => {
    const now = Date.now();
    
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
    const isSignificantVolume = currentVolume > 20;
    
    // Analyze frequency characteristics for clap-like sounds
    const highFreqEnergy = calculateHighFrequencyEnergy(frequencyData);
    const isClappyFrequency = highFreqEnergy > 0.2;
    
    // Single clap detection
    const isSingleClap = isSuddenSpike && isAboveBaseline && isSignificantVolume && isClappyFrequency;
    
    if (isSingleClap) {
      const timeSinceLastClap = now - lastClapTimeRef.current;
      
      // Only process if enough time has passed since last clap
      if (timeSinceLastClap > CLAP_COOLDOWN) {
        console.log(`👏 Clap detected! Volume: ${currentVolume.toFixed(1)}`);
        
        // Add clap to sequence
        clapSequenceRef.current.push(now);
        
        // Keep only recent claps (within wake window)
        clapSequenceRef.current = clapSequenceRef.current.filter(
          clapTime => now - clapTime <= WAKE_CLAP_WINDOW
        );
        
        // Check for wake pattern (single clap or double clap)
        if (clapSequenceRef.current.length >= 1) {
          const timeSinceLastWake = now - (localStorage.getItem('lastWakeTime') || 0);
          
          if (timeSinceLastWake > WAKE_COOLDOWN) {
            console.log(`🎯 CLAP WAKE ACTIVATED!`);
            
            // Store last wake time
            localStorage.setItem('lastWakeTime', now.toString());
            
            // Clear clap sequence to prevent multiple triggers
            clapSequenceRef.current = [];
            lastClapTimeRef.current = now;
            
            return true;
          }
        }
        
        lastClapTimeRef.current = now;
      }
    }
    
    return false;
  }, []);
  
  // Calculate high-frequency energy for clap detection
  const calculateHighFrequencyEnergy = useCallback((frequencyData) => {
    const totalBins = frequencyData.length;
    const highFreqStart = Math.floor(totalBins * 0.6);
    
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
  
  // Enhanced listening loop for wake detection
  const startWakeListening = useCallback(() => {
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
        const sample = (timeData[i] - 128) / 128;
        sum += sample * sample;
      }
      const rmsVolume = Math.sqrt(sum / timeData.length) * 100;
      
      // Enhanced clap wake detection
      if (detectClapWake(rmsVolume, frequencyData)) {
        // Visual and audio feedback
        showClapWakeFeedback();
        
        // Trigger callback
        if (onClapDetected && typeof onClapDetected === 'function') {
          console.log("🎯 Activating wake via clap detection!");
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
  }, [enabled, isListening, onClapDetected, detectClapWake]);
  
  // Visual feedback for clap wake detection
  const showClapWakeFeedback = useCallback(() => {
    // Create visual indicator
    const indicator = document.createElement('div');
    indicator.className = 'clap-wake-detected';
    indicator.innerHTML = '🎯';
    indicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(100, 149, 237, 0.95);
      border-radius: 50%;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-size: 30px;
      animation: clapWakePulse 0.8s ease-out;
      pointer-events: none;
      box-shadow: 0 0 30px rgba(100, 149, 237, 0.8);
      border: 2px solid rgba(255, 255, 255, 0.8);
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
      const audio = new Audio('/assets/sounds/activate.mp3');
      audio.volume = 0.4;
      audio.play().catch(err => console.warn("Couldn't play wake sound:", err));
    } catch (err) {
      console.warn("Error with wake sound:", err);
    }
  }, []);
  
  // Clean up audio resources
  const cleanupAudio = useCallback(() => {
    console.log("🧹 Cleaning up clap wake detection...");
    
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
    clapSequenceRef.current = [];
    setIsListening(false);
  }, []);
  
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
    adjustSensitivity,
    clapSensitivity
  };
}