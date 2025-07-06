class ChatService {
  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    this.userInfo = {
      name: "darling", // Default name for the user
      preferences: {},
      recentTopics: [],
    };
    this.wifePersonality = {
      tone: "caring",
      pet_names: ["honey", "sweetheart", "darling", "love"],
      traits: ["supportive", "playful", "caring", "slightly sassy"],
      interests: ["your day", "your wellbeing", "making you smile"]
    };
    
    // Knowledge base for common factual questions
    this.knowledgeBase = {
      // Countries and capitals
      "capital of india": "New Delhi is the capital of India.",
      "capital of usa": "Washington D.C. is the capital of the United States.",
      "capital of uk": "London is the capital of the United Kingdom.",
      "capital of australia": "Canberra is the capital of Australia.",
      "capital of japan": "Tokyo is the capital of Japan.",
      "capital of china": "Beijing is the capital of China.",
      "capital of russia": "Moscow is the capital of Russia.",
      "capital of france": "Paris is the capital of France.",
      
      // Presidents and Prime Ministers
      "president of india": "Droupadi Murmu is the President of India, serving since July 2022.",
      "president of usa": "Joe Biden is the President of the United States, serving since January 2021.",
      "president of russia": "Vladimir Putin is the President of Russia.",
      "prime minister of india": "Narendra Modi is the Prime Minister of India, serving since May 2014.",
      "prime minister of uk": "Keir Starmer is the Prime Minister of the United Kingdom, taking office in July 2024.",
      "prime minister of canada": "Justin Trudeau is the Prime Minister of Canada.",
      "prime minister of australia": "Anthony Albanese is the Prime Minister of Australia.",
      
      // Basic science
      "distance from earth to moon": "The average distance from Earth to the Moon is about 238,855 miles (384,400 kilometers).",
      "distance from earth to sun": "The average distance from Earth to the Sun is about 93 million miles (150 million kilometers).",
      "speed of light": "The speed of light in a vacuum is approximately 186,282 miles per second (299,792 kilometers per second).",
      "largest planet": "Jupiter is the largest planet in our solar system.",
      "closest planet to sun": "Mercury is the closest planet to the Sun in our solar system.",
      
      // Basic history
      "world war 2": "World War II was a global war that lasted from 1939 to 1945, involving many of the world's nations, including all of the great powers.",
      "moon landing": "The first crewed Moon landing occurred on July 20, 1969, as part of NASA's Apollo 11 mission, when Neil Armstrong and Buzz Aldrin walked on the Moon's surface.",
      
      // Other facts
      "tallest mountain": "Mount Everest is Earth's highest mountain above sea level, with a peak at 29,032 feet (8,849 meters) above sea level.",
      "deepest ocean": "The Mariana Trench in the Pacific Ocean is the deepest known part of the world's oceans, reaching a depth of about 36,070 feet (10,994 meters).",
      "largest ocean": "The Pacific Ocean is the largest and deepest of Earth's oceanic divisions.",
    };
  }

  // Get API key for the selected provider
  getApiKey(provider) {
    const apiKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
    
    const apiKeyMap = {
      'gemini': 'GEMINI_API_KEY',
      'openai': 'openai',
      'groq': 'GROQ_API_KEY',
      'ollama': 'OLLAMA_API_KEY',
      'together': 'TOGETHER_API_KEY',
      'huggingface': 'HUGGINGFACE_API_KEY',
      'mistral': 'MISTRAL_API_KEY',
      'custom': 'CUSTOM_API_KEY',
    };
    
    const keyName = apiKeyMap[provider];
    return apiKeys[keyName];
  }

  // Process message with selected AI provider
  async processMessage(message, provider = 'gemini') {
    const apiKey = this.getApiKey(provider);
    
    if (!apiKey) {
      return {
        text: `Honey, could you set up your ${provider} API key in the settings? I need that to talk with you properly. ❤️`,
        error: true
      };
    }
    
    try {
      let response;
      
      // Update recent topics based on user message
      this.updateRecentTopics(message);
      
      switch (provider) {
        case 'gemini':
          response = await this.generateWifeResponse(message, "Gemini");
          break;
        case 'openai':
          response = await this.generateWifeResponse(message, "OpenAI");
          break;
        case 'groq':
          response = await this.generateWifeResponse(message, "Groq");
          break;
        case 'ollama':
          response = await this.generateWifeResponse(message, "Ollama");
          break;
        case 'together':
          response = await this.generateWifeResponse(message, "Together AI");
          break;
        case 'huggingface':
          response = await this.generateWifeResponse(message, "Hugging Face");
          break;
        case 'mistral':
          response = await this.generateWifeResponse(message, "Mistral AI");
          break;
        case 'custom':
          response = await this.generateWifeResponse(message, "Custom AI");
          break;
        default:
          response = await this.generateWifeResponse(message, provider);
          break;
      }
      
      // Convert response to speech
      this.speakResponse(response);
      
      return { text: response };
    } catch (error) {
      console.error('Error processing message:', error);
      return { 
        text: `Oh no, sweetheart! Something went wrong: ${error.message || 'I couldn\'t process what you said'}. Can you try again?`, 
        error: true 
      };
    }
  }
  
  // Generate wife-like responses using AI APIs
  async generateWifeResponse(message, providerName) {
    console.log(`Processing message with ${providerName}`);
    
    // Try to answer from knowledge base first
    const factualAnswer = this.getFactualAnswer(message);
    if (factualAnswer) {
      console.log("Found answer in knowledge base");
      return factualAnswer;
    }
    
    // Track message keywords for context
    this.updateRecentTopics(message);
    
    // Select random pet name
    const petName = this.wifePersonality.pet_names[
      Math.floor(Math.random() * this.wifePersonality.pet_names.length)
    ];
    
    // Get the context from recent topics
    const context = this.userInfo.recentTopics.join(', ');
    
    // Based on provider, generate a response using the appropriate API
    switch(providerName.toLowerCase()) {
      case "gemini":
        return this.generateGeminiResponse(message, petName, context);
      default:
        return this.generateEnhancedResponse(message, petName);
    }
  }
  
  // Check if message is a factual question and provide answer from knowledge base
  getFactualAnswer(message) {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Check direct matches in knowledge base
    for (const [key, answer] of Object.entries(this.knowledgeBase)) {
      if (normalizedMessage.includes(key)) {
        // Add a personal touch to the factual answer
        const petNames = this.wifePersonality.pet_names;
        const petName = petNames[Math.floor(Math.random() * petNames.length)];
        return `${answer} Is there anything else you'd like to know, ${petName}? 💕`;
      }
    }
    
    // Handle specific questions that aren't direct matches
    if (normalizedMessage.includes("who is the president of india")) {
      return "Droupadi Murmu is the President of India, serving since July 2022. Anything else you'd like to know, sweetheart? 💕";
    }
    
    if (normalizedMessage.includes("who is the prime minister of india")) {
      return "Narendra Modi is the Prime Minister of India, serving since May 2014. He's currently in his third term. What else would you like to talk about, honey? 💕";
    }
    
    // Check for question patterns
    if (normalizedMessage.match(/who is|what is|when is|where is|why is|how is/i) ||
        normalizedMessage.match(/who are|what are|when are|where are|why are|how are/i)) {
      
      // Extract potential entity from question
      const questionWords = normalizedMessage.split(' ');
      
      // Look for partial matches in knowledge base
      for (const [key, answer] of Object.entries(this.knowledgeBase)) {
        // Check if multiple words from the knowledge base key appear in the question
        const keyWords = key.split(' ');
        const matchingWords = keyWords.filter(word => 
          questionWords.includes(word) && word.length > 3
        );
        
        if (matchingWords.length >= 2 || (keyWords.length === 1 && matchingWords.length === 1)) {
          const petName = this.wifePersonality.pet_names[
            Math.floor(Math.random() * this.wifePersonality.pet_names.length)
          ];
          return `${answer} Is there anything else you'd like to know, ${petName}? 💕`;
        }
      }
    }
    
    // No match found in knowledge base
    return null;
  }
  
  // Generate response using Gemini AI
  async generateGeminiResponse(message, petName, context) {
    // Get API key from the getApiKey method
    const geminiApiKey = this.getApiKey('gemini');
    
    if (!geminiApiKey) {
      console.warn("No Gemini API key found. Using fallback response.");
      return this.generateEnhancedResponse(message, petName);
    }
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${geminiApiKey}`;
    
    // Check if this might be a music request
    const isMusicRequest = this.detectMusicRequest(message);
    let promptTemplate;
    
    if (isMusicRequest) {
      promptTemplate = `
        You are Wify, a caring and helpful AI companion. The user is asking about music.
        Always address them with endearment terms like "${petName}" or similar.
        
        Recent conversation topics: ${context}
        
        User message: "${message}"
        
        Since this appears to be a music request, respond enthusiastically about their music taste.
        Make your response personal, warm, and appreciative of their music choice.
        Include emojis to express your excitement about their music selection.
        Keep your response brief (under 80 words) but engaging and supportive.
        Never mention that you are an AI.
      `;
    } else {
      promptTemplate = `
        You are a caring, supportive, and loving AI companion named Wify. Respond to the user in a warm, caring manner.
        Always address them with endearment terms like "${petName}" or similar.
        
        Recent conversation topics: ${context}
        
        User message: "${message}"
        
        Respond in a natural, conversational manner. Keep your response concise (under 100 words) but helpful.
        Include emojis occasionally to express emotions. Never mention that you are an AI.
        If they ask a question, provide an accurate and factual answer rather than redirecting.
        For factual questions, make sure your information is accurate.
      `;
    }
    
    try {
      console.log("Sending request to Gemini API...");
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptTemplate
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 250,
            topP: 0.95,
            topK: 40
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Gemini API error:", errorData);
        throw new Error(`API error: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      // Extract the generated text from the response
      if (data.candidates && data.candidates[0] && data.candidates[0].content && 
          data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        console.log("Received valid response from Gemini API");
        return data.candidates[0].content.parts[0].text;
      }
      
      // Fallback if response format is unexpected
      console.warn("Unexpected response format from Gemini API");
      return this.generateEnhancedResponse(message, petName);
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return this.generateEnhancedResponse(message, petName);
    }
  }
  
  // Helper method to detect if a message is likely a music request
  detectMusicRequest(message) {
    const musicPatterns = [
      /play\s+.+/i,
      /listen\s+to\s+.+/i,
      /put\s+on\s+.+/i,
      /sing\s+.+/i,
      /music\s+by\s+.+/i,
      /song\s+.+/i,
      /track\s+.+/i,
      /artist\s+.+/i
    ];
    
    return musicPatterns.some(pattern => pattern.test(message));
  }
  
  // Enhanced fallback response with more factual answers
  generateEnhancedResponse(message, petName) {
    // First try to find a factual answer
    const factualAnswer = this.getFactualAnswer(message);
    if (factualAnswer) return factualAnswer;
    
    // Determine response type based on message content
    const lowerMessage = message.toLowerCase();
    let responseType = "normal";
    
    // Identify common question patterns
    if (lowerMessage.match(/who|what|when|where|why|how/i) && lowerMessage.includes("?")) {
      responseType = "question";
    } 
    else if (lowerMessage.includes("love you") || lowerMessage.includes("miss you")) {
      responseType = "affectionate";
    } 
    else if (lowerMessage.includes("how are you") || lowerMessage.includes("how's your day")) {
      responseType = "personal";
    } 
    else if (lowerMessage.includes("help") || lowerMessage.includes("can you")) {
      responseType = "helpful";
    } 
    else if (lowerMessage.includes("joke") || lowerMessage.includes("funny")) {
      responseType = "playful";
    }
    
    // Generate response based on type
    switch (responseType) {
      case "question":
        if (lowerMessage.includes("weather")) {
          return `I wish I could check the weather for you right now, ${petName}. Would you like me to help you find a weather app or website? 💙`;
        } else if (lowerMessage.includes("time")) {
          const now = new Date();
          return `It's currently ${now.toLocaleTimeString()}, ${petName}. How can I help you today? ⏰`;
        } else if (lowerMessage.includes("date") || lowerMessage.includes("day")) {
          const now = new Date();
          return `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, ${petName}. How are you doing today? 📅`;
        } else {
          return `That's an interesting question, ${petName}! While I don't have all the information at my fingertips, I'd be happy to discuss this with you. What are your thoughts on it? 🤔`;
        }
      
      case "affectionate":
        return `I love you too, ${petName}! ❤️ You always know how to make me smile. How's your day going?`;
      
      case "personal":
        return `I'm doing well, thanks for asking! Just happy to be talking with you, ${petName}. Tell me more about your day?`;
      
      case "helpful":
        return `Of course, ${petName}! I'd be happy to help with that. What specifically do you need assistance with?`;
      
      case "playful":
        const jokes = [
          `Why don't scientists trust atoms? Because they make up everything! 😄`,
          `Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them! 😂`,
          `Why was the computer cold? It left its Windows open! 🤭`,
          `What do you call a fake noodle? An impasta! 🍝`,
          `Why did the scarecrow win an award? Because he was outstanding in his field! 🌾`
        ];
        return `${petName}, here's one for you: ${jokes[Math.floor(Math.random() * jokes.length)]}`;
      
      default:
        // Generate a contextual response based on message content
        if (message.length < 10) {
          return `Hey ${petName}, tell me more! I'm all ears. 😊`;
        } else {
          const responses = [
            `I see what you mean, ${petName}. That's really interesting! Tell me more?`,
            `You know, ${petName}, I was just thinking about something similar earlier. Great minds think alike!`,
            `I appreciate you sharing that with me, ${petName}. It's these little conversations that make our connection special.`,
            `That's fascinating! You always have such unique perspectives, ${petName}. What else is on your mind?`,
            `I'm so glad you told me that, ${petName}! You know I'm always here to listen.`
          ];
          return responses[Math.floor(Math.random() * responses.length)];
        }
    }
  }
  
  // Update recent topics based on user message
  updateRecentTopics(message) {
    const words = message.toLowerCase().split(/\s+/);
    const meaningfulWords = words.filter(word => 
      word.length > 3 && 
      !["what", "when", "where", "which", "this", "that", "with", "your", "from", "have", "there", "their", "about"].includes(word)
    );
    
    if (meaningfulWords.length > 0) {
      this.userInfo.recentTopics = [
        ...meaningfulWords.slice(0, 3),
        ...this.userInfo.recentTopics
      ].slice(0, 5);
      
      console.log("Updated recent topics:", this.userInfo.recentTopics);
    }
  }
  
  // Convert text to speech with feminine voice
  speakResponse(text) {
    // Stop any current speech
    this.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a feminine voice
    let voices = this.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Look for female voices - often have "female" or feminine names in the name
      const femaleVoices = voices.filter(voice => 
        voice.name.toLowerCase().includes("female") || 
        voice.name.toLowerCase().includes("fiona") ||
        voice.name.toLowerCase().includes("samantha") ||
        voice.name.toLowerCase().includes("victoria") ||
        voice.name.toLowerCase().includes("karen") ||
        voice.name.toLowerCase().includes("moira") ||
        voice.name.toLowerCase().includes("tessa")
      );
      
      if (femaleVoices.length > 0) {
        utterance.voice = femaleVoices[0];
      }
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.2;  // Slightly higher pitch for feminine voice
    utterance.volume = 1.0;
    
    this.speechSynthesis.speak(utterance);
  }
}

export default new ChatService();