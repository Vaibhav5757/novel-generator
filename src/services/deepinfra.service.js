const { TextGeneration } = require('deepinfra');
const { createDeepInfra } = require('@ai-sdk/deepinfra');
const { streamText } = require('ai');
const config = require('../config');
const logger = require('../utils/logger');

class DeepInfraService {
  constructor() {
    this.apiKey = config.get('deepinfra.apiKey');
    if (!this.apiKey) {
      throw new Error('DEEPINFRA_API_KEY environment variable is not set');
    }
    this.models = {};

    // Initialize AI SDK client for streaming
    this.deepinfra = createDeepInfra({
      apiKey: this.apiKey,
    });
  }

  async getModel(model) {
    if (!this.models[model]) {
      this.models[model] = new TextGeneration(model, this.apiKey);
    }
    return this.models[model];
  }

  // Existing generateText method - keep as is
  async generateText(prompt, model, options = {}) {
    try {
      const dpModel = await this.getModel(model);
      const body = {
        input: prompt,
        ...options,
      };
      const output = await dpModel.generate(body);
      const { num_tokens: tokens_consumed, num_input_tokens: tokens_prompt } = output;
      const { generated_text: text } = output.results[0];
      return { text, tokens_consumed, tokens_prompt };
    } catch (error) {
      logger.error('DeepInfra API Error:', error);
      throw new Error('Failed to generate text from DeepInfra');
    }
  }

  // New streaming method
  async generateTextStream(prompt, model, options = {}, onChunk) {
    try {
      logger.info('Starting streaming text generation', { model, prompt: prompt.substring(0, 100) + '...' });

      const result = streamText({
        model: this.deepinfra(model),
        prompt: prompt,
        temperature: options.temperature || 0.7,
        topP: options.top_p || 1.0,
        topK: options.top_k || 0,
        maxTokens: options.max_new_tokens || 2000,
        presencePenalty: options.presence_penalty || 0.0,
        frequencyPenalty: options.frequency_penalty || 0.0,
      });

      let fullText = '';
      let chunkCount = 0;

      // Stream the text chunks
      for await (const textPart of result.textStream) {
        fullText += textPart;
        chunkCount++;

        // Call the callback with each chunk
        if (onChunk) {
          await onChunk(textPart, {
            fullTextSoFar: fullText,
            chunkNumber: chunkCount,
          });
        }
      }

      // Get final usage statistics
      const usage = await result.usage;
      const finishReason = await result.finishReason;

      logger.info('Streaming text generation completed', {
        model,
        fullTextLength: fullText.length,
        chunkCount,
        usage,
        finishReason,
      });

      return {
        text: fullText,
        tokens_consumed: usage?.completionTokens || 0,
        tokens_prompt: usage?.promptTokens || 0,
        total_tokens: usage?.totalTokens || 0,
        finish_reason: finishReason,
        chunks_generated: chunkCount,
      };
    } catch (error) {
      logger.error('DeepInfra Streaming API Error:', error);
      throw new Error('Failed to generate streaming text from DeepInfra: ' + error.message);
    }
  }

  // Utility method to check if streaming is supported for a model
  isStreamingSupported(model) {
    // Add logic here to check if the model supports streaming
    // For now, assume all models support streaming
    return true;
  }
}

module.exports = new DeepInfraService();
