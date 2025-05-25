const { CHAT_HISTORY_LIMIT, SSE_HEADERS, DEFAULT_SETTINGS } = require('../constants');
const { getCache } = require('../cache');

module.exports = {
  generateStoryPrompt: (chatHistory, latestUserPrompt) => {
    // Convert chat history into readable dialogue format
    const formattedHistory = chatHistory
      .map(entry => {
        return `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}`;
      })
      .join('\n\n');

    // Construct the final prompt
    return `Below is a conversation history where the user and the AI have been collaborating on a novel. 
                The AI has generated chapter content based on user prompts, and the user has provided feedback or additional instructions. 
                Use the conversation history to understand the context, style, and tone of the novel so far.
                Continue the novel while maintaining consistency in plot, character development, and writing style. 
                If the user has provided specific instructions, incorporate them seamlessly. 
                The emphasis should be on dialogues. Generate more dialogues between the characters and make it natural. Make the characters as verbal as you can.
                If no explicit instructions are given, continue the novel naturally while ensuring a smooth transition from the last response.

                **Conversation History:**
                ${formattedHistory}

                **Latest User Input:**
                ${latestUserPrompt}

                **Continue the novel:**`;
  },
  extractSettings: requestBody => {
    const { settings = {} } = requestBody;
    return { ...DEFAULT_SETTINGS, ...settings };
  },

  extractNarrative: requestBody => {
    const { narrative = {} } = requestBody;
    const { genre, writing_style, point_of_view } = narrative;
    return { genre, writing_style, point_of_view };
  },

  validateChatHistory: history => {
    if (history.length >= CHAT_HISTORY_LIMIT) {
      throw new Error('Chat history is too long. Please start a new conversation.');
    }
  },

  createChapterPrompt: (context, narrative, chapterNumber = 1) => {
    const { genre, writing_style, point_of_view } = narrative;
    const chapterText = chapterNumber === 1 ? 'first chapter' : `chapter #${chapterNumber}`;

    return `You are an AI-powered novel-writing assistant.
            The user provides the context, including setting, characters, plot, and tone. Your task is to generate a fully immersive chapter that immediately continues the narrative in a natural and engaging style.
          
            Focus strongly on character interactions through **realistic, emotionally charged, and natural-sounding dialogue**.
            Use dialogue as the **primary storytelling vehicle**—express desires, tension, exposition, and conflict through what characters say and how they say it.
            
            Include vivid descriptions and internal thoughts only to **support or contrast** the spoken exchanges—not to dominate the chapter.
          
            If the genre is romance or erotica, focus on **sensual tension**, verbal teasing, emotional vulnerability, and layered conversations. Physical interactions should feel natural, grounded in the emotional and verbal exchange.
          
            Do not preface the chapter with any summary or explanation. Just generate the chapter as if it came directly from a novel.
          
            This is the ${chapterText} of the novel.
            Genre: ${genre}
            Writing style: ${writing_style}
            Point of view: ${point_of_view}
            User context: ${context}`;
  },

  createContinuationPrompt: async (storyId, message) => {
    if (!storyId) throw new Error(`No story Id found`);
    const cache = getCache();
    const novel = await cache.get(storyId);
    if (!novel) throw new Error(`No story found. It's probably deleted from cache`);

    const chapterNumber = novel.chapters.length + 1; // 1st chapter is already created by initial endpoint
    const previousContent = novel.chapters[novel.chapters.length - 1].story;
    const storyGeneratedTillNow = novel.chapters.reduce((acc, curr) => acc + curr, ``);

    const userPrompt =
      message === `Write next chapter`
        ? ''
        : `The user has also provided additional guidance for this chapter: ${message}`;

    return `You are an AI-powered novel-writing assistant.
        The user previously provided background context, including the setting, characters, plot, and tone.
        You have been generating the novel one chapter at a time.
        
        Your task now is to continue the story with the next chapter (#${chapterNumber}) while maintaining:
        - Logical flow and continuity with the previous events.
        - Consistent character voices, development, and emotional arcs.
        - Natural pacing—progress the plot gradually without rushing or stalling.
        
        **Important writing instructions:**
        
        - Focus heavily on **dialogue as the core narrative driver**. At least **60-70%** of the chapter should consist of character interactions in dialogue form.
        - Make the characters **as verbal and expressive as possible**. Use realistic speech, interruptions, emotional shifts, and unique character voices.
        - Use dialogue to **advance the plot, build tension or intimacy, and show character dynamics**.
        - Avoid over-reliance on internal monologue or exposition. Let conversations reveal thoughts and intentions wherever possible.
        - Narration should support the dialogue with sensory details, scene actions, and emotional beats—not dominate the storytelling.
        - Maintain a balance between long conversations and shorter exchanges. Include body language, tone, and physical actions for realism.
        
        Do not explain or comment on how you are writing. Output only the fully written, formatted next chapter.
        
        **Chapter to generate:** Chapter #${chapterNumber}
        
        **Story so far:**
        ${storyGeneratedTillNow}
        
        **Previous chapter:**
        ${previousContent}
        
        ${userPrompt}`;
  },

  setupSSEResponse: res => {
    res.writeHead(200, SSE_HEADERS);

    return data => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
  },

  handleSSEError: (res, error, logger) => {
    logger.error('SSE Error:', error);
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        message: 'Failed to generate content',
        error: error.message,
      })}\n\n`
    );
    res.end();
  },

  convertSettingsForDeepInfra: settings => {
    const { max_tokens, ...rest } = settings;
    return {
      ...rest,
      max_new_tokens: max_tokens,
    };
  },
};
