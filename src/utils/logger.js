const winston = require('winston');
const { format, transports } = winston;
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const config = require('../config');

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFormat = format.combine(
  format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

const logger = winston.createLogger({
  level: config.get('env') === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'api-service' },
  transports: [
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: 'info',
    }),

    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
  ],
});

if (config.get('env') !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

morgan.token('response-headers', (req, res) => {
  const headers = {};

  const headerNames = res.getHeaderNames();

  headerNames.forEach(name => {
    const headerValue = res.getHeader(name);

    if (typeof name === 'string') {
      const parts = name.split('-');
      const prefix = parts[0].toLowerCase();

      if (parts.length > 1) {
        if (!headers[prefix]) {
          headers[prefix] = {};
        }

        let headerKey = parts
          .slice(1)
          .map((part, index) =>
            index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          )
          .join('');

        headers[prefix][headerKey] = headerValue;
      } else {
        headers[name.toLowerCase()] = headerValue;
      }
    }
  });

  return headers;
});

logger.morganFormat = (tokens, req, res) => {
  const headers = tokens['response-headers'](req, res);

  return JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: parseInt(tokens.status(req, res) || 0),
    responseTime: parseFloat(tokens['response-time'](req, res) || 0),
    contentLength: tokens.res(req, res, 'content-length') || 0,

    requestId: req.requestId || '-',
    remoteAddr: tokens['remote-addr'](req, res) || '-',
    referrer: tokens.referrer(req, res) || '-',
    userAgent: tokens['user-agent'](req, res) || '-',
    timestamp: new Date().toISOString(),

    headers: headers,
  });
};

logger.stream = {
  write: message => {
    try {
      const parsedMessage = JSON.parse(message);
      logger.info('HTTP Access Log', parsedMessage);
    } catch (e) {
      logger.info(message.trim());
    }
  },
};

module.exports = logger;
