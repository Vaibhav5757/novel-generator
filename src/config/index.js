// Load environment variables first, before convict is initialized
require('dotenv').config();

const convict = require('convict');
const config = convict({
  env: {
    doc: 'The application environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  port: {
    doc: 'The port to bind to',
    format: 'port',
    default: 3000,
    env: 'PORT',
  },
  deepinfra: {
    apiKey: {
      doc: 'DeepInfra API Key',
      format: String,
      default: '',
      env: 'DEEPINFRA_API_KEY',
    },
  },
  mongodb: {
    uri: {
      doc: 'MongoDB connection URI',
      format: String,
      default: 'mongodb://localhost:27017/mydatabase',
      env: 'MONGODB_URI',
    },
  },
  redis: {
    uri: {
      doc: 'Redis connection URI',
      format: String,
      default: 'redis://localhost:6379',
      env: 'REDIS_URI',
    },
  },
});

// Perform validation
config.validate({ allowed: 'strict' });

module.exports = config;
