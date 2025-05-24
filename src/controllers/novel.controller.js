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

const generateEndlessChapters = async (req, res) => {
  const sendSSEData = setupSSEResponse(res);

  try {
    const { context, model } = req.body;
    const settings = extractSettings(req.body);
    const narrative = extractNarrative(req.body);
    const deepInfraSettings = convertSettingsForDeepInfra(settings);

    sendSSEData({ type: 'status', message: 'Starting chapter generation...' });

    // Generate first chapter
    const firstPrompt = createChapterPrompt(context, narrative, 1);
    sendSSEData({ type: 'status', message: 'Generating Chapter 1...' });

    const {
      text: firstContent,
      tokens_consumed: firstTokensConsumed,
      tokens_prompt: firstTokensPrompt,
    } = await deepInfraService.generateTextStream(firstPrompt, model, deepInfraSettings, async chunk => {
      sendSSEData({
        type: 'chunk',
        content: chunk,
        chapter: 1,
        streaming: true,
      });
    });

    sendSSEData({
      type: 'chapter_complete',
      chapter: 1,
      tokens_consumed: firstTokensConsumed,
      tokens_prompt: firstTokensPrompt,
    });

    // Initialize tracking variables
    let previousContent = firstContent;
    let storyGeneratedTillNow = firstContent;
    let tokens_consumed_total = firstTokensConsumed;
    let tokens_prompt_total = firstTokensPrompt;
    const noOfChapter = config.get('endless_chapter_count');
    const summarisedPrompt = [firstPrompt];

    // Generate subsequent chapters
    for (let i = 2; i <= noOfChapter; i++) {
      sendSSEData({
        type: 'status',
        message: `Generating Chapter ${i}...`,
        progress: {
          current: i,
          total: noOfChapter,
        },
      });

      const nextChapterPrompt = createContinuationPrompt(i, storyGeneratedTillNow, previousContent);
      summarisedPrompt.push(nextChapterPrompt);

      const {
        text: contentOfThisChapter,
        tokens_consumed,
        tokens_prompt,
      } = await deepInfraService.generateTextStream(nextChapterPrompt, model, deepInfraSettings, async chunk => {
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

      sendSSEData({
        type: 'chapter_complete',
        chapter: i,
        tokens_consumed,
        tokens_prompt,
      });

      // Update tracking variables
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

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    handleSSEError(res, error, logger);
  }
};

const chatEndless = async (req, res) => {
  const sendSSEData = setupSSEResponse(res);

  try {
    const { message, history, model } = req.body;
    const settings = extractSettings(req.body);

    validateChatHistory(history);

    sendSSEData({ type: 'status', message: 'Continuing the story...' });

    const prompt = generateStoryPrompt(history, message);
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

    sendSSEData({
      type: 'chapter_complete',
      tokens_consumed,
      tokens_prompt,
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
  generateEndlessChapters,
  chatEndless,
};
