const { v4: uuidv4 } = require('uuid');
const {
  generateStoryPrompt,
  extractSettings,
  extractNarrative,
  validateChatHistory,
  createChapterPrompt,
  createContinuationPrompt,
  setupSSEResponse,
  handleSSEError,
  convertSettingsForDeepInfra,
} = require('../helper');
const deepInfraService = require('../services/deepinfra.service');
const logger = require('../utils/logger');
const config = require('../config');
const { getCache } = require('../cache');

const generateChapter = async (req, res) => {
  try {
    const { context, model } = req.body;
    const settings = extractSettings(req.body);
    const narrative = extractNarrative(req.body);

    const prompt = createChapterPrompt(context, narrative);
    const deepInfraSettings = convertSettingsForDeepInfra(settings);

    const {
      text: content,
      tokens_consumed,
      tokens_prompt,
    } = await deepInfraService.generateText(prompt, model, deepInfraSettings);

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
    const settings = extractSettings(req.body);

    validateChatHistory(history);

    const prompt = generateStoryPrompt(history, message);
    const deepInfraSettings = convertSettingsForDeepInfra(settings);

    const {
      text: content,
      tokens_consumed,
      tokens_prompt,
    } = await deepInfraService.generateText(prompt, model, deepInfraSettings);

    return res.json({
      content,
      prompt_used: prompt,
      tokens_consumed,
      tokens_prompt,
    });
  } catch (error) {
    if (error.message.includes('Chat history is too long')) {
      return res.status(429).json({ content: error.message });
    }

    logger.error('Error processing chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
};

const streamChapterCreate = async (req, res) => {
  const sendSSEData = setupSSEResponse(res);

  try {
    const { context, model } = req.body;
    const settings = extractSettings(req.body);
    const narrative = extractNarrative(req.body);
    const deepInfraSettings = convertSettingsForDeepInfra(settings);
    const cache = getCache();

    sendSSEData({ type: 'status', message: 'Starting chapter generation...' });

    // Generate first chapter
    const firstPrompt = createChapterPrompt(context, narrative, 1);
    sendSSEData({ type: 'status', message: 'Generating Chapter 1...' });

    const { text, tokens_consumed, tokens_prompt } = await deepInfraService.generateTextStream(
      firstPrompt,
      model,
      deepInfraSettings,
      async chunk => {
        sendSSEData({
          type: 'chunk',
          content: chunk,
          chapter: 1,
          streaming: true,
        });
      }
    );

    const storyId = uuidv4();
    sendSSEData({
      type: 'chapter_complete',
      chapter: 1,
      tokens_consumed,
      tokens_prompt,
      story_id: storyId,
    });

    await cache.set(
      storyId,
      {
        chapters: [
          {
            type: 'chapter_complete',
            chapter: 1,
            tokens_consumed,
            tokens_prompt,
            story: text,
          },
        ],
      },
      30 * 60 // cache story for 30 mins
    );

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    handleSSEError(res, error, logger);
  }
};

const chatStream = async (req, res) => {
  const sendSSEData = setupSSEResponse(res);

  try {
    const { message = '', history = [], model, story_id } = req.body;
    const settings = extractSettings(req.body);
    const cache = getCache();

    validateChatHistory(history);

    sendSSEData({ type: 'status', message: 'Continuing the story...' });

    const prompt = await createContinuationPrompt(story_id, message);
    sendSSEData({ type: 'status', message: 'Generating next chapter...' });

    const deepInfraSettings = convertSettingsForDeepInfra(settings);

    const {
      text: content,
      tokens_consumed,
      tokens_prompt,
    } = await deepInfraService.generateTextStream(prompt, model, deepInfraSettings, async chunk => {
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

    // Update cache
    const existing = await cache.get(story_id);
    await cache.set(
      story_id,
      {
        chapters: [
          ...existing.chapters, // copy existing chapters
          {
            type: 'chapter_complete',
            chapter: existing.chapters.length + 1,
            tokens_consumed,
            tokens_prompt,
            story: content,
          },
        ],
      },
      30 * 60 // cache story for 30 mins
    );

    sendSSEData({
      type: 'chapter_complete',
      tokens_consumed,
      tokens_prompt,
      story_id: story_id,
    });

    sendSSEData({
      type: 'complete',
      summary: {
        prompt_used: prompt,
        tokens_consumed,
        tokens_prompt,
        content_length: content.length,
      },
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    if (error.message.includes('Chat history is too long')) {
      sendSSEData({
        type: 'error',
        message: error.message,
      });
      res.end();
      return;
    }

    handleSSEError(res, error, logger);
  }
};

module.exports = {
  generateChapter,
  chat,
  streamChapterCreate,
  chatStream,
};
