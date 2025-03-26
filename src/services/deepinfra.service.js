const { TextGeneration } = require('deepinfra');
const config = require('../config');
const logger = require('../utils/logger');

class DeepInfraService {
    constructor() {
        this.apiKey = config.get('deepinfra.apiKey');
        if (!this.apiKey) {
            throw new Error('DEEPINFRA_API_KEY environment variable is not set');
        }
        this.models = {};
    }

    async getModel(model) {
        if (!this.models[model]) {
            this.models[model] = new TextGeneration(model, this.apiKey);
        }
        return this.models[model];
    }

    async generateText(prompt, model, options = {}) {
        try {
            const dpModel = await this.getModel(model);
            const body = {
                input: prompt,
                ...options
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
}

module.exports = new DeepInfraService(); 