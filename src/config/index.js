const convict = require('convict');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = convict({
  env: {
    doc: 'The application environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind to',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  api: {
    prefix: {
      doc: 'API prefix',
      format: String,
      default: '/api',
      env: 'API_PREFIX'
    },
    version: {
      doc: 'API version',
      format: String,
      default: 'v1',
      env: 'API_VERSION'
    }
  },
  deepinfra: {
    apiKey: {
      doc: 'DeepInfra API Key',
      format: String,
      default: '',
      env: 'DEEPINFRA_API_KEY'
    },
    baseUrl: {
      doc: 'DeepInfra API Base URL',
      format: String,
      default: 'https://api.deepinfra.com/v1/inference',
      env: 'DEEPINFRA_BASE_URL'
    }
  }
});

// Perform validation
config.validate({ allowed: 'strict' });

module.exports = config; 