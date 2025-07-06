import { useEffect, useRef } from 'react';

export class VRMController {
  constructor(vrm) {
    this.vrm = vrm;
    this.currentEmotion = 'neutral';
    this.lipSyncActive = false;
    this.danceActive = false;
    this.audioAnalyzer = null;
    this.animationFrame = null;
  }

  // Facial Expressions
  setEmotion(emotion) {
    if (!this.vrm?.expressionManager) return;
    
    // Reset all expressions
    this.vrm.expressionManager.setValue('happy', 0);
    this.vrm.expressionManager.setValue('sad', 0);
    this.vrm.expressionManager.setValue('angry', 0);
    this.vrm.expressionManager.setValue('surprised', 0);
    this.vrm.expressionManager.setValue('relaxed', 0);
    
    // Set target emotion
    switch(emotion) {
      case 'happy':
        this.vrm.expressionManager.setValue('happy', 1.0);
        break;
      case 'sad':
        this.vrm.expressionManager.setValue('sad', 1.0);
        break;
      case 'angry':
        this.vrm.expressionManager.setValue('angry', 1.0);
        break;
      case 'surprised':
        this.vrm.expressionManager.setValue('surprised', 1.0);
        break;
      case 'relaxed':
        this.vrm.expressionManager.setValue('relaxed', 1.0);
        break;
      default:
        // neutral - all expressions at 0
        break;
    }
    
    this.currentEmotion = emotion;
    this.vrm.expressionManager.update();
  }

  // Lip Sync
  startLipSync(audioElement) {
    if (!audioElement || this.lipSyncActive) return;
    
    this.lipSyncActive = true;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audioElement);
    const analyzer = audioContext.createAnalyser();
    
    source.connect(analyzer);
    analyzer.connect(audioContext.destination);
    
    analyzer.fftSize = 256;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateLipSync = () => {
      if (!this.lipSyncActive) return;
      
      analyzer.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for(let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      
      // Map volume to mouth movement (0-1)
      const mouthOpen = Math.min(average / 128, 1.0);
      
      if (this.vrm?.expressionManager) {
        // Use 'aa' expression for mouth opening or fallback to custom blendshape
        if (this.vrm.expressionManager.expressionMap.has('aa')) {
          this.vrm.expressionManager.setValue('aa', mouthOpen);
        } else if (this.vrm.expressionManager.expressionMap.has('mouthOpen')) {
          this.vrm.expressionManager.setValue('mouthOpen', mouthOpen);
        }
        this.vrm.expressionManager.update();
      }
      
      this.animationFrame = requestAnimationFrame(updateLipSync);
    };
    
    updateLipSync();
  }

  stopLipSync() {
    this.lipSyncActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    // Reset mouth
    if (this.vrm?.expressionManager) {
      this.vrm.expressionManager.setValue('aa', 0);
      this.vrm.expressionManager.setValue('mouthOpen', 0);
      this.vrm.expressionManager.update();
    }
  }

  // Dance Animation
  startDance(audioElement) {
    if (!audioElement || this.danceActive) return;
    
    this.danceActive = true;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audioElement);
    const analyzer = audioContext.createAnalyser();
    
    source.connect(analyzer);
    analyzer.connect(audioContext.destination);
    
    analyzer.fftSize = 1024;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let danceTime = 0;
    
    const updateDance = () => {
      if (!this.danceActive) return;
      
      analyzer.getByteFrequencyData(dataArray);
      danceTime += 0.016; // ~60fps
      
      // Analyze frequency bands
      const bass = this.getFrequencyAverage(dataArray, 0, 64);
      const mid = this.getFrequencyAverage(dataArray, 64, 256);
      const treble = this.getFrequencyAverage(dataArray, 256, bufferLength);
      
      if (this.vrm?.humanoid) {
        // Body sway based on bass
        const swayAmount = (bass / 255) * 0.3;
        const sway = Math.sin(danceTime * 2) * swayAmount;
        
        if (this.vrm.humanoid.getBoneNode('spine')) {
          this.vrm.humanoid.getBoneNode('spine').rotation.z = sway;
        }
        
        // Arm movement based on mid frequencies
        const armMovement = (mid / 255) * 0.5;
        const leftArmRotation = Math.sin(danceTime * 3) * armMovement;
        const rightArmRotation = Math.sin(danceTime * 3 + Math.PI) * armMovement;
        
        if (this.vrm.humanoid.getBoneNode('leftUpperArm')) {
          this.vrm.humanoid.getBoneNode('leftUpperArm').rotation.z = leftArmRotation;
        }
        if (this.vrm.humanoid.getBoneNode('rightUpperArm')) {
          this.vrm.humanoid.getBoneNode('rightUpperArm').rotation.z = rightArmRotation;
        }
        
        // Head nod based on treble
        const headNod = (treble / 255) * 0.2;
        const nod = Math.sin(danceTime * 4) * headNod;
        
        if (this.vrm.humanoid.getBoneNode('head')) {
          this.vrm.humanoid.getBoneNode('head').rotation.x = nod;
        }
      }
      
      this.animationFrame = requestAnimationFrame(updateDance);
    };
    
    updateDance();
  }

  stopDance() {
    this.danceActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    // Reset poses
    if (this.vrm?.humanoid) {
      const bones = ['spine', 'leftUpperArm', 'rightUpperArm', 'head'];
      bones.forEach(boneName => {
        const bone = this.vrm.humanoid.getBoneNode(boneName);
        if (bone) {
          bone.rotation.set(0, 0, 0);
        }
      });
    }
  }

  getFrequencyAverage(dataArray, start, end) {
    let sum = 0;
    for(let i = start; i < end; i++) {
      sum += dataArray[i];
    }
    return sum / (end - start);
  }

  // Emotion from text analysis
  analyzeEmotionFromText(text) {
    const happyWords = ['happy', 'joy', 'excited', 'love', 'wonderful', 'amazing', 'great', 'fantastic', '😊', '😍', '💕', '❤️'];
    const sadWords = ['sad', 'sorry', 'disappointed', 'hurt', 'cry', 'tears', 'upset', '😢', '😭', '💔'];
    const angryWords = ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'frustrated', '😠', '😡', '🤬'];
    const surprisedWords = ['wow', 'amazing', 'incredible', 'surprised', 'shocked', 'unbelievable', '😲', '😮', '🤯'];
    
    const lowerText = text.toLowerCase();
    
    if (happyWords.some(word => lowerText.includes(word))) return 'happy';
    if (sadWords.some(word => lowerText.includes(word))) return 'sad';
    if (angryWords.some(word => lowerText.includes(word))) return 'angry';
    if (surprisedWords.some(word => lowerText.includes(word))) return 'surprised';
    
    return 'neutral';
  }

  cleanup() {
    this.stopLipSync();
    this.stopDance();
    this.setEmotion('neutral');
  }
}