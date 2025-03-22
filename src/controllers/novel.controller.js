const { generateStoryPrompt } = require('../helper');
const deepInfraService = require('../services/deepinfra.service');

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
        n = 1,
      } = {},
      narrative: {
        genre,
        writing_style,
        point_of_view,
      } = {},
    } = req.body;


    // Construct the prompt based on context
    let prompt = `You are an AI-powered novel-writing assistant. 
           The user will provide a background context, including setting, characters, plot, and tone. 
           Your task is to generate a well-written, immersive chapter that aligns with the given details. 
           Do not analyze or plan in your response—immediately generate the chapter in a fluid, engaging manner. 
           Ensure logical flow, strong character development, and vivid descriptions. Use appropriate pacing, dialogue, and narrative techniques suited to the genre. 
           The output should be a fully formatted chapter, not an explanation of how you are writing it.
           This chapter is part of a novel and is the first chapter.
           The chapter should be in the following genre: ${genre}.
           The chapter should be written in the following style: ${writing_style}.
           The chapter should be written in the following point of view: ${point_of_view}.
           Here's the context given by the user: ${context}`;

    // Generate text using DeepInfra
    const content = await deepInfraService.generateText(prompt, model, {
      temperature,
      top_p,
      top_k,
      max_tokens,
      presence_penalty,
      frequency_penalty,
      repetition_penalty,
      n,
    });

    return res.json({ content, prompt_used: prompt });
  } catch (error) {
    console.error('Error generating chapter:', error);
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
        n = 1,
      } = {},
    } = req.body;

    if (history.length >= 20) {
      return res.status(429).json({ content: 'Chat history is too long. Please start a new conversation.' });
    }

    // Generate prompt
    const prompt = generateStoryPrompt(history, message);

    // Generate text using DeepInfra
    const content = await deepInfraService.generateText(prompt, model, {
      temperature,
      top_p,
      max_tokens,
      presence_penalty,
      frequency_penalty,
      repetition_penalty,
      top_k,
      n,
    });

    return res.json({ content, prompt_used: prompt });
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
};

module.exports = {
  generateChapter,
  chat
}; 