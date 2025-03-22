const { TextGeneration } = require('deepinfra');
const config = require('../config');

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
                options
            };
            const output = await dpModel.generate(body);
            const text = output.results[0].generated_text;
            return text;
        } catch (error) {
            console.error('DeepInfra API Error:', error);
            throw new Error('Failed to generate text from DeepInfra');
        }
    }
}

module.exports = new DeepInfraService(); 