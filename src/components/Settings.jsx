import { useState, useEffect } from 'react';
import { FaCog, FaTimes, FaEye, FaEyeSlash, FaRobot, FaMusic, FaVolumeUp } from 'react-icons/fa';

export const Settings = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('ai');
  const [activeProvider, setActiveProvider] = useState('openai');
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    youtube: '',
    elevenlabs: '',
    GEMINI_API_KEY: ''
  });
  
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
    google: false,
    youtube: false,
    elevenlabs: false,
    GEMINI_API_KEY: false
  });

  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState('');
  const [ttsProvider, setTtsProvider] = useState('system');

  // Load saved settings from localStorage
  useEffect(() => {
    const savedProvider = localStorage.getItem('activeProvider');
    const savedKeys = localStorage.getItem('apiKeys');
    const savedVoiceId = localStorage.getItem('elevenLabsVoiceId');
    const savedTtsProvider = localStorage.getItem('ttsProvider');
    
    if (savedProvider) {
      setActiveProvider(savedProvider);
    }
    
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    }

    if (savedVoiceId) {
      setElevenLabsVoiceId(savedVoiceId);
    }

    if (savedTtsProvider) {
      setTtsProvider(savedTtsProvider);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('activeProvider', activeProvider);
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
    localStorage.setItem('elevenLabsVoiceId', elevenLabsVoiceId);
    localStorage.setItem('ttsProvider', ttsProvider);
  };

  const handleProviderChange = (provider) => {
    setActiveProvider(provider);
  };

  const handleApiKeyChange = (provider, key) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: key
    }));
  };

  const toggleShowKey = (provider) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const handleSave = () => {
    saveSettings();
    onClose();
  };

  if (!isOpen) return null;

  const renderAISettings = () => (
    <div className="tab-content">
      <div className="setting-group">
        <label>AI Provider</label>
        <div className="provider-buttons">
          <button
            className={`provider-button ${activeProvider === 'openai' ? 'active' : ''}`}
            onClick={() => handleProviderChange('openai')}
          >
            OpenAI
          </button>
          <button
            className={`provider-button ${activeProvider === 'anthropic' ? 'active' : ''}`}
            onClick={() => handleProviderChange('anthropic')}
          >
            Anthropic
          </button>
          <button
            className={`provider-button ${activeProvider === 'google' ? 'active' : ''}`}
            onClick={() => handleProviderChange('google')}
          >
            Google
          </button>
        </div>
      </div>

      <div className="setting-group">
        <label htmlFor="openai-key">OpenAI API Key</label>
        <div className="api-key-input">
          <input
            id="openai-key"
            type={showKeys.openai ? "text" : "password"}
            value={apiKeys.openai}
            onChange={(e) => handleApiKeyChange('openai', e.target.value)}
            placeholder="sk-..."
          />
          <button
            type="button"
            onClick={() => toggleShowKey('openai')}
            className="toggle-visibility"
          >
            {showKeys.openai ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      <div className="setting-group">
        <label htmlFor="anthropic-key">Anthropic API Key</label>
        <div className="api-key-input">
          <input
            id="anthropic-key"
            type={showKeys.anthropic ? "text" : "password"}
            value={apiKeys.anthropic}
            onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
            placeholder="sk-ant-..."
          />
          <button
            type="button"
            onClick={() => toggleShowKey('anthropic')}
            className="toggle-visibility"
          >
            {showKeys.anthropic ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      <div className="setting-group">
        <label htmlFor="google-key">Google AI API Key</label>
        <div className="api-key-input">
          <input
            id="google-key"
            type={showKeys.google ? "text" : "password"}
            value={apiKeys.google}
            onChange={(e) => handleApiKeyChange('google', e.target.value)}
            placeholder="AI..."
          />
          <button
            type="button"
            onClick={() => toggleShowKey('google')}
            className="toggle-visibility"
          >
            {showKeys.google ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>
      
      <div className="setting-group">
        <label htmlFor="gemini-key">Gemini API Key</label>
        <div className="api-key-input">
          <input
            id="gemini-key"
            type={showKeys.GEMINI_API_KEY ? "text" : "password"}
            value={apiKeys.GEMINI_API_KEY}
            onChange={(e) => handleApiKeyChange('GEMINI_API_KEY', e.target.value)}
            placeholder="AIzaSy..."
          />
          <button
            type="button"
            onClick={() => toggleShowKey('GEMINI_API_KEY')}
            className="toggle-visibility"
          >
            {showKeys.GEMINI_API_KEY ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <small className="setting-help">
          Required for real-time AI responses
        </small>
      </div>

      <div className="setting-group">
        <label htmlFor="gemini-key">Gemini API Key</label>
        <div className="api-key-input">
          <input
            id="gemini-key"
            type={showKeys.GEMINI_API_KEY ? "text" : "password"}
            value={apiKeys.GEMINI_API_KEY}
            onChange={(e) => handleApiKeyChange('GEMINI_API_KEY', e.target.value)}
            placeholder="AIzaSy..."
          />
          <button
            type="button"
            onClick={() => toggleShowKey('GEMINI_API_KEY')}
            className="toggle-visibility"
          >
            {showKeys.GEMINI_API_KEY ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <small className="setting-help">
          Required for real-time AI responses
        </small>
      </div>
    </div>
  );

  const renderMusicSettings = () => (
    <div className="tab-content">
      <div className="setting-group">
        <label htmlFor="youtube-key">YouTube Data API Key</label>
        <div className="api-key-input">
          <input
            id="youtube-key"
            type={showKeys.youtube ? "text" : "password"}
            value={apiKeys.youtube}
            onChange={(e) => handleApiKeyChange('youtube', e.target.value)}
            placeholder="AIza..."
          />
          <button
            type="button"
            onClick={() => toggleShowKey('youtube')}
            className="toggle-visibility"
          >
            {showKeys.youtube ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        <small className="setting-help">
          Get your API key from Google Cloud Console with YouTube Data API v3 enabled
        </small>
      </div>
    </div>
  );

  const renderVoiceSettings = () => (
    <div className="tab-content">
      <div className="setting-group">
        <label>Text-to-Speech Provider</label>
        <div className="provider-buttons">
          <button
            className={`provider-button ${ttsProvider === 'system' ? 'active' : ''}`}
            onClick={() => setTtsProvider('system')}
          >
            System Voice
          </button>
          <button
            className={`provider-button ${ttsProvider === 'google' ? 'active' : ''}`}
            onClick={() => setTtsProvider('google')}
          >
            Google TTS
          </button>
          <button
            className={`provider-button ${ttsProvider === 'elevenlabs' ? 'active' : ''}`}
            onClick={() => setTtsProvider('elevenlabs')}
          >
            ElevenLabs
          </button>
        </div>
      </div>

      {ttsProvider === 'elevenlabs' && (
        <>
          <div className="setting-group">
            <label htmlFor="elevenlabs-key">ElevenLabs API Key</label>
            <div className="api-key-input">
              <input
                id="elevenlabs-key"
                type={showKeys.elevenlabs ? "text" : "password"}
                value={apiKeys.elevenlabs}
                onChange={(e) => handleApiKeyChange('elevenlabs', e.target.value)}
                placeholder="sk_..."
              />
              <button
                type="button"
                onClick={() => toggleShowKey('elevenlabs')}
                className="toggle-visibility"
              >
                {showKeys.elevenlabs ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label htmlFor="voice-id">ElevenLabs Voice ID</label>
            <input
              id="voice-id"
              type="text"
              value={elevenLabsVoiceId}
              onChange={(e) => setElevenLabsVoiceId(e.target.value)}
              placeholder="21m00Tcm4TlvDq8ikWAM"
            />
            <small className="setting-help">
              Find voice IDs in your ElevenLabs dashboard
            </small>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>Settings</h2>
          <button onClick={onClose} className="close-button">
            <FaTimes />
          </button>
        </div>
        
        <div className="settings-tabs">
          <button
            className={`tab-button ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <FaRobot /> AI
          </button>
          <button
            className={`tab-button ${activeTab === 'music' ? 'active' : ''}`}
            onClick={() => setActiveTab('music')}
          >
            <FaMusic /> Music
          </button>
          <button
            className={`tab-button ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            <FaVolumeUp /> Voice
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'ai' && renderAISettings()}
          {activeTab === 'music' && renderMusicSettings()}
          {activeTab === 'voice' && renderVoiceSettings()}
        </div>

        <div className="settings-footer">
          <button onClick={handleSave} className="save-button">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};