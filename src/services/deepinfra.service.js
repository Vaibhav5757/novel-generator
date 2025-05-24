const { TextGeneration } = require('deepinfra');
const { createDeepInfra } = require('@ai-sdk/deepinfra');
const { streamText } = require('ai');
const config = require('../config');
const logger = require('../utils/logger');

// Constants
const DEFAULT_OPTIONS = {
  temperature: 0.7,
  top_p: 1.0,
  top_k: 0,
  max_new_tokens: 2000,
  presence_penalty: 0.0,
  frequency_penalty: 0.0,
  repetition_penalty: 1.0,
};

// Error messages
const ERROR_MESSAGES = {
  API_KEY_MISSING: 'DEEPINFRA_API_KEY environment variable is not set',
  GENERATION_FAILED: 'Failed to generate text from DeepInfra',
  STREAMING_FAILED: 'Failed to generate streaming text from DeepInfra',
  MODEL_INVALID: 'Invalid or unsupported model',
};

class DeepInfraService {
  constructor() {
    this.apiKey = this._validateApiKey();
    this.models = new Map(); // Use Map for better performance
    this.deepinfra = this._initializeStreamingClient();
  }

  // Private methods
  _validateApiKey() {
    const apiKey = config.get('deepinfra.apiKey');
    if (!apiKey) {
      throw new Error(ERROR_MESSAGES.API_KEY_MISSING);
    }
    return apiKey;
  }

  _initializeStreamingClient() {
    return createDeepInfra({
      apiKey: this.apiKey,
    });
  }

  _normalizeOptions(options = {}) {
    return {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  _validateModel(model) {
    if (!model || typeof model !== 'string') {
      throw new Error(ERROR_MESSAGES.MODEL_INVALID);
    }
  }

  _logGenerationStart(method, model, prompt) {
    logger.info(`Starting ${method} text generation`, {
      model,
      prompt: prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt,
      promptLength: prompt.length,
    });
  }

  _logGenerationComplete(method, model, result) {
    logger.info(`${method} text generation completed`, {
      model,
      textLength: result.text?.length || 0,
      tokensConsumed: result.tokens_consumed || 0,
      tokensPrompt: result.tokens_prompt || 0,
      ...(result.chunkCount && { chunkCount: result.chunkCount }),
      ...(result.finish_reason && { finishReason: result.finish_reason }),
    });
  }

  _mapStreamingOptions(options) {
    return {
      temperature: options.temperature,
      topP: options.top_p,
      topK: options.top_k,
      maxTokens: options.max_new_tokens,
      presencePenalty: options.presence_penalty,
      frequencyPenalty: options.frequency_penalty,
      // Note: repetition_penalty is not directly supported by AI SDK
    };
  }

  _extractUsageStats(usage) {
    return {
      tokens_consumed: usage?.completionTokens || 0,
      tokens_prompt: usage?.promptTokens || 0,
      total_tokens: usage?.totalTokens || 0,
    };
  }

  // Public methods
  async getModel(model) {
    this._validateModel(model);

    if (!this.models.has(model)) {
      this.models.set(model, new TextGeneration(model, this.apiKey));
    }
    return this.models.get(model);
  }

  async generateText(prompt, model, options = {}) {
    try {
      this._validateModel(model);
      this._logGenerationStart('Standard', model, prompt);

      const normalizedOptions = this._normalizeOptions(options);
      const dpModel = await this.getModel(model);

      const body = {
        input: prompt,
        ...normalizedOptions,
      };

      const output = await dpModel.generate(body);

      const result = {
        text: output.results[0]?.generated_text || '',
        tokens_consumed: output.num_tokens || 0,
        tokens_prompt: output.num_input_tokens || 0,
      };

      this._logGenerationComplete('Standard', model, result);
      return result;
    } catch (error) {
      logger.error('DeepInfra API Error:', {
        model,
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`${ERROR_MESSAGES.GENERATION_FAILED}: ${error.message}`);
    }
  }

  async generateTextStream(prompt, model, options = {}, onChunk) {
    try {
      this._validateModel(model);
      this._logGenerationStart('Streaming', model, prompt);

      const normalizedOptions = this._normalizeOptions(options);
      const streamingOptions = this._mapStreamingOptions(normalizedOptions);

      const result = streamText({
        model: this.deepinfra(model),
        prompt: prompt,
        ...streamingOptions,
      });

      let fullText = '';
      let chunkCount = 0;

      // Process streaming chunks
      for await (const textPart of result.textStream) {
        fullText += textPart;
        chunkCount++;

        if (onChunk) {
          await onChunk(textPart, {
            fullTextSoFar: fullText,
            chunkNumber: chunkCount,
          });
        }
      }

      // Wait for final results
      const [usage, finishReason] = await Promise.all([result.usage, result.finishReason]);

      const finalResult = {
        text: fullText,
        ...this._extractUsageStats(usage),
        finish_reason: finishReason,
        chunks_generated: chunkCount,
      };

      this._logGenerationComplete('Streaming', model, {
        ...finalResult,
        chunkCount,
      });

      return finalResult;
    } catch (error) {
      logger.error('DeepInfra Streaming API Error:', {
        model,
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`${ERROR_MESSAGES.STREAMING_FAILED}: ${error.message}`);
    }
  }

  // Utility methods
  clearModelCache() {
    this.models.clear();
    logger.info('Model cache cleared');
  }

  getLoadedModels() {
    return Array.from(this.models.keys());
  }

  async healthCheck() {
    try {
      // Simple health check with a minimal request
      await this.generateText('Hello', 'meta-llama/Llama-2-7b-chat-hf', {
        max_new_tokens: 1,
      });
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Graceful shutdown
  async shutdown() {
    logger.info('Shutting down DeepInfra service...');
    this.clearModelCache();
    // Add any cleanup logic here
    logger.info('DeepInfra service shutdown complete');
  }
}

// Create and export singleton instance
const deepInfraService = new DeepInfraService();

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await deepInfraService.shutdown();
});

process.on('SIGINT', async () => {
  await deepInfraService.shutdown();
});

module.exports = deepInfraService;
