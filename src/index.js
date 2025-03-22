const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const config = require('./config');

// Log configuration (remove in production)
console.log('Configuration loaded:', {
  env: config.get('env'),
  port: config.get('port'),
  apiPrefix: config.get('api.prefix'),
  deepinfraBaseUrl: config.get('deepinfra.baseUrl')
});

const app = express();
const port = config.get('port');

// Middleware
app.use(cors());
app.use(express.json());

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
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
const novelRoutes = require('./routes/novel.routes');
app.use(`${config.get('api.prefix')}/novel`, novelRoutes);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route for SPA - must be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Swagger documentation available at http://localhost:${port}/api-docs`);
}); 