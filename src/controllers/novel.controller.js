const { generateStoryPrompt } = require('../helper');
const deepInfraService = require('../services/deepinfra.service');
const logger = require('../utils/logger');
const config = require('../config');

const generateChapter = async (req, res) => {
  try {
    const { context, model } = req.body;
    const {
      settings: {
        temperature = 0.7,
        top_p = 1.0,
        top_k = 0,
        presence_penalty = 0.0,
        frequency_penalty = 0.0,
        repetition_penalty = 1.0,
        max_tokens = 2000,
      } = {},
      narrative: { genre, writing_style, point_of_view } = {},
    } = req.body;

    // Construct the prompt based on context
    let prompt = `You are an AI-powered novel-writing assistant. 
           The user will provide a background context, including setting, characters, plot, and tone. 
           Your task is to generate a well-written, immersive chapter that aligns with the given details. 
           Do not analyze or plan in your response—immediately generate the chapter in a fluid, engaging manner. 
           Ensure logical flow, strong character development, and vivid descriptions. Use appropriate pacing, dialogue, and narrative techniques suited to the genre. 
           The output should be a fully formatted chapter, not an explanation of how you are writing it.
           The emphasis should be on dialogues. Generate more dialogues between the characters and make it natural. Make the characters as verbal as you can.
           This chapter is part of a novel and is the first chapter.
           The chapter should be in the following genre: ${genre}.
           The chapter should be written in the following style: ${writing_style}.
           The chapter should be written in the following point of view: ${point_of_view}.
           Here's the context given by the user: ${context}`;

    // Generate text using DeepInfra
    const {
      text: content,
      tokens_consumed,
      tokens_prompt,
    } = await deepInfraService.generateText(prompt, model, {
      temperature,
      top_p,
      top_k,
      max_new_tokens: max_tokens,
      repetition_penalty,
      presence_penalty,
      frequency_penalty,
    });

    return res.json({
      content,
      prompt_used: prompt,
      tokens_consumed,
      tokens_prompt,
    });
  } catch (error) {
    logger.error('Error generating chapter:', error);
    res.status(500).json({ error: 'Failed to generate chapter' });
  }
};

const chat = async (req, res) => {
  try {
    const { message, history, model } = req.body;
    const {
      settings: {
        temperature = 0.7,
        top_p = 1.0,
        top_k = 0,
        presence_penalty = 0.0,
        frequency_penalty = 0.0,
        repetition_penalty = 1.0,
        max_tokens = 2000,
      } = {},
    } = req.body;

    if (history.length >= 20) {
      return res.status(429).json({
        content: 'Chat history is too long. Please start a new conversation.',
      });
    }

    // Generate prompt
    const prompt = generateStoryPrompt(history, message);

    // Generate text using DeepInfra
    const {
      text: content,
      tokens_consumed,
      tokens_prompt,
    } = await deepInfraService.generateText(prompt, model, {
      temperature,
      top_p,
      top_k,
      max_new_tokens: max_tokens,
      repetition_penalty,
      presence_penalty,
      frequency_penalty,
    });

    return res.json({
      content,
      prompt_used: prompt,
      tokens_consumed,
      tokens_prompt,
    });
  } catch (error) {
    logger.error('Error processing chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
};

const generateEndlessChapters = async (req, res) => {
  try {
    const { context, model } = req.body;
    const {
      settings: {
        temperature = 0.7,
        top_p = 1.0,
        top_k = 0,
        presence_penalty = 0.0,
        frequency_penalty = 0.0,
        repetition_penalty = 1.0,
        max_tokens = 2000,
      } = {},
      narrative: { genre, writing_style, point_of_view } = {},
    } = req.body;

    const settings = {
      temperature,
      top_p,
      top_k,
      max_new_tokens: max_tokens,
      repetition_penalty,
      presence_penalty,
      frequency_penalty,
    };

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Helper function to send SSE data
    const sendSSEData = data => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial status
    sendSSEData({ type: 'status', message: 'Starting chapter generation...' });

    // Prompt of first chapter
    let prompt = `You are an AI-powered novel-writing assistant. 
           The user will provide a background context, including setting, characters, plot, and tone. 
           Your task is to generate a well-written, immersive chapter that aligns with the given details. 
           Do not analyze or plan in your response—immediately generate the chapter in a fluid, engaging manner. 
           Ensure logical flow, strong character development, and vivid descriptions. Use appropriate pacing, dialogue, and narrative techniques suited to the genre. 
           The output should be a fully formatted chapter, not an explanation of how you are writing it.
           The emphasis should be on dialogues. Generate more dialogues between the characters and make it natural. Make the characters as verbal as you can.
           This chapter is part of a novel and is the first chapter.
           The chapter should be in the following genre: ${genre}.
           The chapter should be written in the following style: ${writing_style}.
           The chapter should be written in the following point of view: ${point_of_view}.
           Here's the context given by the user: ${context}`;

    // Send chapter 1 generation status
    sendSSEData({ type: 'status', message: 'Generating Chapter 1...' });

    // Generate first chapter with streaming
    const {
      text: content,
      tokens_consumed,
      tokens_prompt,
    } = await deepInfraService.generateTextStream(prompt, model, settings, async (chunk, meta) => {
      // Stream each chunk of the first chapter
      sendSSEData({
        type: 'chunk',
        content: chunk,
        chapter: 1,
        streaming: true,
      });
    });

    // Send chapter 1 completion
    sendSSEData({
      type: 'chapter_complete',
      chapter: 1,
      tokens_consumed,
      tokens_prompt,
    });

    let previousContent = content;
    let storyGeneratedTillNow = `${content}`;
    let tokens_consumed_total = tokens_consumed;
    let tokens_prompt_total = tokens_prompt;
    const noOfChapter = config.get('endless_chapter_count');
    const summarisedPrompt = [prompt];

    // Generate subsequent chapters
    for (let i = 2; i <= noOfChapter; ++i) {
      // Send chapter generation status
      sendSSEData({
        type: 'status',
        message: `Generating Chapter ${i}...`,
        progress: {
          current: i,
          total: noOfChapter,
        },
      });

      // Construct the prompt based on context
      let nextChapterPrompt = `You are an AI-powered novel-writing assistant. 
        The user had provided a background context, including setting, characters, plot, and tone. 
        A well-written, immersive chapter was generated which had aligned with the given details by user.
        You need to continue the chapter or novel further now with same logical flow while maintaining character development.
        The pacing of chapter or novel is not to be altered too much but progressed gradually.
        Do not analyze or plan in your response—immediately generate the content of this or next chapter in a fluid, engaging manner. 
        The output should be a fully formatted chapter, not an explanation of how you are writing it.
        The emphasis should be on dialogues. Generate more dialogues between the characters and make it natural.
        Make the characters as verbal as you can.
        This chapter is part of a novel and is the  chapter #${i}.
        Story so far is ${storyGeneratedTillNow}
        Chapter produced earlier is ${previousContent}
        `;

      summarisedPrompt.push(nextChapterPrompt);

      const {
        text: contentOfThisChapter,
        tokens_consumed,
        tokens_prompt,
      } = await deepInfraService.generateTextStream(nextChapterPrompt, model, settings, async (chunk, meta) => {
        // Stream each chunk of this chapter
        sendSSEData({
          type: 'chunk',
          content: chunk,
          chapter: i,
          streaming: true,
        });
      });

      logger.info(`Chapter #${i} generated`, {
        contentLength: contentOfThisChapter.length,
        tokens_consumed,
        tokens_prompt,
      });

      // Send chapter completion
      sendSSEData({
        type: 'chapter_complete',
        chapter: i,
        tokens_consumed,
        tokens_prompt,
      });

      previousContent = contentOfThisChapter;
      storyGeneratedTillNow += contentOfThisChapter;
      tokens_consumed_total += tokens_consumed;
      tokens_prompt_total += tokens_prompt;
    }

    // Send final completion data
    sendSSEData({
      type: 'complete',
      summary: {
        prompt_used: summarisedPrompt.join('#####Prompt-End#####'),
        tokens_consumed: tokens_consumed_total,
        tokens_prompt: tokens_prompt_total,
        chapters_generated: noOfChapter,
        total_content_length: storyGeneratedTillNow.length,
      },
    });

    // Send done signal
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error('Error generating chapter:', error);

    // Send error via SSE
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        message: 'Failed to generate chapter',
        error: error.message,
      })}\n\n`
    );

    res.end();
  }
};

const chatEndless = async (req, res) => {
  try {
    const { message, history, model } = req.body;
    const {
      settings: {
        temperature = 0.7,
        top_p = 1.0,
        top_k = 0,
        presence_penalty = 0.0,
        frequency_penalty = 0.0,
        repetition_penalty = 1.0,
        max_tokens = 2000,
      } = {},
    } = req.body;

    // Check rate limiting before setting up SSE
    if (history.length >= 20) {
      return res.status(429).json({
        content: 'Chat history is too long. Please start a new conversation.',
      });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Helper function to send SSE data
    const sendSSEData = data => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial status
    sendSSEData({ type: 'status', message: 'Continuing the story...' });

    // Generate prompt
    const prompt = generateStoryPrompt(history, message);

    // Send generation status
    sendSSEData({ type: 'status', message: 'Generating next chapter...' });

    const settings = {
      temperature,
      top_p,
      top_k,
      max_new_tokens: max_tokens,
      repetition_penalty,
      presence_penalty,
      frequency_penalty,
    };

    // Generate text using streaming DeepInfra
    const {
      text: content,
      tokens_consumed,
      tokens_prompt,
    } = await deepInfraService.generateTextStream(prompt, model, settings, async (chunk, meta) => {
      // Stream each chunk of the next chapter
      sendSSEData({
        type: 'chunk',
        content: chunk,
        streaming: true,
      });
    });

    logger.info('Chat chapter generated', {
      contentLength: content.length,
      tokens_consumed,
      tokens_prompt,
    });

    // Send chapter completion
    sendSSEData({
      type: 'chapter_complete',
      tokens_consumed,
      tokens_prompt,
    });

    // Send final completion data
    sendSSEData({
      type: 'complete',
      summary: {
        prompt_used: prompt,
        tokens_consumed,
        tokens_prompt,
        content_length: content.length,
      },
    });

    // Send done signal
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error('Error processing chat:', error);

    // Send error via SSE
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        message: 'Failed to process chat message',
        error: error.message,
      })}\n\n`
    );

    res.end();
  }
};

module.exports = {
  generateChapter,
  chat,
  generateEndlessChapters,
  chatEndless,
};
