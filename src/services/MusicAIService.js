class MusicAIService {
  constructor() {
    this.musicKeywords = {
      play: ['play', 'start', 'begin', 'put on', 'listen to'],
      genres: {
        hindi: ['hindi', 'bollywood', 'indian'],
        english: ['english', 'pop', 'rock', 'jazz'],
        classical: ['classical', 'symphony', 'orchestra'],
        electronic: ['electronic', 'edm', 'techno', 'house'],
        country: ['country', 'folk'],
        hip_hop: ['hip hop', 'rap', 'hiphop'],
        reggae: ['reggae', 'ska'],
        blues: ['blues', 'rhythm and blues']
      },
      moods: {
        happy: ['happy', 'upbeat', 'cheerful', 'energetic', 'joyful'],
        sad: ['sad', 'melancholy', 'emotional', 'heartbreak'],
        romantic: ['romantic', 'love', 'romantic songs', 'love songs'],
        party: ['party', 'dance', 'club', 'celebration'],
        relaxing: ['relaxing', 'calm', 'chill', 'peaceful', 'meditation']
      }
    };
    this.lastSearchResults = null;
    
    // Default YouTube API key
    const apiKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
    if (!apiKeys.youtube) {
      apiKeys.youtube = 'AIzaSyCQbR6x55TRiq6ygvN4z0w4dRRomeBN1Mk';
      localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
    }
  }

  async analyzeMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced music request detection - check for "wify" trigger word
    const hasWifyTrigger = lowerMessage.includes('wify') || lowerMessage.includes('wifi');
    
    // More sophisticated music request detection
    // Direct music commands (e.g., "play something")
    const hasDirectMusicCommand = this.musicKeywords.play.some(keyword => lowerMessage.includes(keyword));
    
    // Music-related terms (songs, genres, artists)
    const hasMusicTerms = 
      lowerMessage.includes('song') || 
      lowerMessage.includes('music') ||
      lowerMessage.includes('artist') ||
      lowerMessage.includes('sing') ||
      lowerMessage.includes('album') ||
      Object.values(this.musicKeywords.genres).flat().some(genre => lowerMessage.includes(genre));
      
    // Voice commands detection (improved for automatic playback)
    const isVoiceCommand = 
      (hasWifyTrigger && hasDirectMusicCommand) || // "Wify play something" - strongest indicator
      (hasWifyTrigger && hasMusicTerms) || // "Wify I want some music" - good indicator
      (hasDirectMusicCommand && hasMusicTerms); // "Play some rock music" - good indicator
      
    // Final music request determination
    const isMusicRequest = isVoiceCommand;

    if (!isMusicRequest) {
      return { isMusicRequest: false };
    }

    // Extract genre
    let detectedGenre = null;
    for (const [genre, keywords] of Object.entries(this.musicKeywords.genres)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        detectedGenre = genre;
        break;
      }
    }

    // Extract mood
    let detectedMood = null;
    for (const [mood, keywords] of Object.entries(this.musicKeywords.moods)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        detectedMood = mood;
        break;
      }
    }

    // Create search query - extract more context from the message
    let searchQuery = '';
    
    // Try to extract artist or specific song name
    const potentialSongInfo = this.extractSongInfo(message);
    if (potentialSongInfo) {
      searchQuery = potentialSongInfo + ' ';
    }
    
    if (detectedGenre) {
      searchQuery += detectedGenre + ' ';
    }
    if (detectedMood) {
      searchQuery += detectedMood + ' ';
    }
    
    // If query is still too generic, use the original message more effectively
    if (!potentialSongInfo && !detectedGenre && !detectedMood) {
      // Remove filler words and extract potential search terms
      const cleanedMessage = message.toLowerCase()
        .replace(/wify|play|some|me|a|the|please|could you|can you|song|music/g, '')
        .trim();
      
      if (cleanedMessage) {
        searchQuery = cleanedMessage;
      } else {
        searchQuery = 'popular songs music';
      }
    } else if (searchQuery.trim() === '') {
      searchQuery = 'popular songs music';
    } else {
      searchQuery += 'songs music';
    }

    return {
      isMusicRequest: true,
      genre: detectedGenre,
      mood: detectedMood,
      searchQuery: searchQuery,
      originalMessage: message,
      autoPlay: hasWifyTrigger // Enable auto-play when triggered with "wify"
    };
  }
  
  // Helper method to extract potential song or artist information
  extractSongInfo(message) {
    // Remove common phrases and words related to playing music
    const cleanMessage = message.toLowerCase()
      .replace(/wify|play|some|me|a|the|please|could you|can you|play me some|play some/g, '')
      .replace(/song|music|songs|track|tracks/g, '')
      .trim();
      
    // If we have enough words left, it might be song or artist info
    if (cleanMessage && cleanMessage.split(' ').length >= 2) {
      return cleanMessage;
    }
    
    return null;
  }

  async searchYouTube(query) {
    const apiKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
    const youtubeApiKey = apiKeys.youtube || 'AIzaSyCQbR6x55TRiq6ygvN4z0w4dRRomeBN1Mk';

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=${youtubeApiKey}`
      );
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      const results = data.items || [];
      this.lastSearchResults = results; // Store search results for later use
      return results;
    } catch (error) {
      console.error('YouTube search error:', error);
      throw error;
    }
  }

  formatMusicResponse(musicAnalysis, searchResults) {
    let response = `Of course, darling! I found some wonderful `;
    
    if (musicAnalysis.genre) {
      response += `${musicAnalysis.genre} `;
    }
    if (musicAnalysis.mood) {
      response += `${musicAnalysis.mood} `;
    }
    
    response += `songs for you! Here are my top picks:\n\n`;
    
    searchResults.forEach((video, index) => {
      response += `${index + 1}. ${video.snippet.title}\n   by ${video.snippet.channelTitle}\n\n`;
    });
    
    // Different response based on if it's auto-play or not
    if (musicAnalysis.autoPlay) {
      response += `I'll start playing the first one for you! If you want to hear a different one, just tell me the number. 💕`;
    } else {
      response += `Just let me know which one you'd like to hear by saying the number or dragging your favorite in the player, sweetheart! 💕`;
    }
    
    return response;
  }

  extractSongChoice(message, searchResults) {
    const lowerMessage = message.toLowerCase();
    
    // Look for numbers
    const numberWords = {
      'one': 1, 'first': 1, '1': 1,
      'two': 2, 'second': 2, '2': 2,
      'three': 3, 'third': 3, '3': 3,
      'four': 4, 'fourth': 4, '4': 4,
      'five': 5, 'fifth': 5, '5': 5
    };
    
    for (const [word, number] of Object.entries(numberWords)) {
      if (lowerMessage.includes(word) && number <= searchResults.length) {
        return {
          isChoice: true,
          songIndex: number - 1,
          selectedSong: searchResults[number - 1]
        };
      }
    }
    
    // Look for song title matches
    for (let i = 0; i < searchResults.length; i++) {
      const title = searchResults[i].snippet.title.toLowerCase();
      const titleWords = title.split(' ');
      
      // Check if message contains significant words from the title
      const matchingWords = titleWords.filter(word => 
        word.length > 3 && lowerMessage.includes(word)
      );
      
      if (matchingWords.length >= 2) {
        return {
          isChoice: true,
          songIndex: i,
          selectedSong: searchResults[i]
        };
      }
    }
    
    return { isChoice: false };
  }
  
  // Get the last set of search results
  getLastSearchResults() {
    return this.lastSearchResults;
  }
  
  // Method to auto-select the first song when auto-play is requested
  getAutoPlaySong(searchResults) {
    if (searchResults && searchResults.length > 0) {
      return {
        isChoice: true,
        songIndex: 0,
        selectedSong: searchResults[0]
      };
    }
    return { isChoice: false };
  }
}

export default new MusicAIService();