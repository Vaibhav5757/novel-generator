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
  deepinfra: {
    apiKey: {
      doc: 'DeepInfra API Key',
      format: String,
      default: '',
      env: 'DEEPINFRA_API_KEY'
    }
  }
});

// Perform validation
config.validate({ allowed: 'strict' });

module.exports = config; 