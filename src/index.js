const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const morgan = require('morgan');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const logger = require('./utils/logger');

// Log configuration (remove in production)
logger.info('Configuration loaded:', {
  env: config.get('env'),
  port: config.get('port'),
});

const app = express();
const port = config.get('port');

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
});

morgan.token('requestId', (req) => req.requestId);

app.use(morgan(
  logger.morganFormat,
  { stream: logger.stream }
));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Novel Generator API',
      version: '1.0.0',
      description: 'API documentation for the AI-powered novel generator',
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/routes/v1.0/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
const novelRoutes = require('./routes/novel.routes');
app.use(`/api/novel`, novelRoutes);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route for SPA - must be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  res.status(err.status || 500).json({
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message
    }
  });
});

// Start the server
app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
  logger.info(`Swagger documentation available at http://localhost:${port}/api-docs`);
}); 