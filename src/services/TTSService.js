class TTSService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;
  }

  async speak(text, provider = 'system') {
    const apiKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
    const ttsProvider = localStorage.getItem('ttsProvider') || 'system';
    
    switch(ttsProvider) {
      case 'system':
        return this.speakWithSystem(text);
      case 'google':
        return this.speakWithGoogle(text, apiKeys.google);
      case 'elevenlabs':
        return this.speakWithElevenLabs(text, apiKeys.elevenlabs);
      default:
        return this.speakWithSystem(text);
    }
  }

  speakWithSystem(text) {
    return new Promise((resolve, reject) => {
      if (this.currentUtterance) {
        this.synth.cancel();
      }

      this.currentUtterance = new SpeechSynthesisUtterance(text);
      
      // Set voice properties for a more feminine, wife-like voice
      const voices = this.synth.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('hazel')
      ) || voices.find(voice => voice.lang.includes('en'));

      if (femaleVoice) {
        this.currentUtterance.voice = femaleVoice;
      }

      this.currentUtterance.rate = 0.9;
      this.currentUtterance.pitch = 1.2;
      this.currentUtterance.volume = 0.8;

      this.currentUtterance.onend = () => resolve();
      this.currentUtterance.onerror = (error) => reject(error);

      this.synth.speak(this.currentUtterance);
    });
  }

  async speakWithGoogle(text, apiKey) {
    if (!apiKey) {
      throw new Error('Google TTS API key not found');
    }

    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: 'en-US',
              name: 'en-US-Neural2-F',
              ssmlGender: 'FEMALE'
            },
            audioConfig: {
              audioEncoding: 'MP3',
              pitch: 2.0,
              speakingRate: 0.9
            }
          })
        }
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      // Play the audio
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      await audio.play();

      return audio;
    } catch (error) {
      console.error('Google TTS error:', error);
      return this.speakWithSystem(text);
    }
  }

  async speakWithElevenLabs(text, apiKey) {
    if (!apiKey) {
      throw new Error('ElevenLabs API key not found');
    }

    const voiceId = localStorage.getItem('elevenLabsVoiceId') || '21m00Tcm4TlvDq8ikWAM';

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      await audio.play();
      return audio;
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      return this.speakWithSystem(text);
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }
}

export default new TTSService();