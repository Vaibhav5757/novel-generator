const { CHAT_HISTORY_LIMIT, SSE_HEADERS, DEFAULT_SETTINGS } = require('../constants');

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
      The user will provide a background context, including setting, characters, plot, and tone. 
      Your task is to generate a well-written, immersive chapter that aligns with the given details. 
      Do not analyze or plan in your response—immediately generate the chapter in a fluid, engaging manner. 
      Ensure logical flow, strong character development, and vivid descriptions. Use appropriate pacing, dialogue, and narrative techniques suited to the genre. 
      The output should be a fully formatted chapter, not an explanation of how you are writing it.
      The emphasis should be on dialogues. Generate more dialogues between the characters and make it natural. Make the characters as verbal as you can.
      This chapter is part of a novel and is the ${chapterText}.
      The chapter should be in the following genre: ${genre}.
      The chapter should be written in the following style: ${writing_style}.
      The chapter should be written in the following point of view: ${point_of_view}.
      Here's the context given by the user: ${context}`;
  },

  createContinuationPrompt: (chapterNumber, storyGeneratedTillNow, previousContent) => {
    return `You are an AI-powered novel-writing assistant. 
      The user had provided a background context, including setting, characters, plot, and tone. 
      A well-written, immersive chapter was generated which had aligned with the given details by user.
      You need to continue the chapter or novel further now with same logical flow while maintaining character development.
      The pacing of chapter or novel is not to be altered too much but progressed gradually.
      Do not analyze or plan in your response—immediately generate the content of this or next chapter in a fluid, engaging manner. 
      The output should be a fully formatted chapter, not an explanation of how you are writing it.
      The emphasis should be on dialogues. Generate more dialogues between the characters and make it natural.
      Make the characters as verbal as you can.
      This chapter is part of a novel and is the chapter #${chapterNumber}.
      Story so far is ${storyGeneratedTillNow}
      Chapter produced earlier is ${previousContent}`;
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
