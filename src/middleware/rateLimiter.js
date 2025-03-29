const logger = require('../utils/logger');

// Global counter that resets daily at midnight
const DAILY_LIMIT = 100;
let globalRequestCount = 0;

// Function to calculate time until next midnight
function getTimeUntilMidnight() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Set to midnight (00:00:00)
  return tomorrow.getTime() - now.getTime();
}

// Set initial reset time to next midnight
let resetTime = Date.now() + getTimeUntilMidnight();

const rateLimiter = async (req, res, next) => {
  try {
    // Check if we need to reset the counter (new day)
    const now = Date.now();
    if (now > resetTime) {
      globalRequestCount = 0;
      resetTime = now + getTimeUntilMidnight();
    }

    // Check if limit reached
    if (globalRequestCount >= DAILY_LIMIT) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'The API has reached its daily limit of 100 requests. Please try again tomorrow.',
        remaining: 0
      });
    }

    // Increment counter
    globalRequestCount++;

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', DAILY_LIMIT);
    res.setHeader('X-RateLimit-Remaining', DAILY_LIMIT - globalRequestCount);
    res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());

    next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    // In case of error, allow the request to proceed
    next();
  }
};

module.exports = rateLimiter;