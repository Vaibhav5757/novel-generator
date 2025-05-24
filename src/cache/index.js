const Redis = require('ioredis');
const config = require('../config');

class CacheStore {
  constructor(options = {}) {
    // Get Redis URI from config
    const redisUri = config.get('redis.uri');

    // Default Redis configuration
    const defaultConfig = {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    // Merge default config with user options
    this.config = { ...defaultConfig, ...options };

    // Initialize Redis client with URI and config
    this.redis = new Redis(redisUri, this.config);

    // Handle connection events
    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.redis.on('error', err => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Parsed value or null if not found
   */
  async get(key) {
    try {
      if (!key) {
        throw new Error('Key is required');
      }

      const value = await this.redis.get(key);

      if (value === null) {
        return null;
      }

      // Try to parse JSON, if it fails return the raw string
      try {
        return JSON.parse(value);
      } catch (parseError) {
        return value;
      }
    } catch (error) {
      console.error(`Error getting key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Set value in cache with optional expiry
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {number} expiry - Expiry time in seconds (optional)
   * @returns {Promise<string>} - Redis response
   */
  async set(key, value, expiry = null) {
    try {
      if (!key) {
        throw new Error('Key is required');
      }

      // Serialize the value
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

      // Set with or without expiry
      if (expiry && expiry > 0) {
        return await this.redis.setex(key, expiry, serializedValue);
      } else {
        return await this.redis.set(key, serializedValue);
      }
    } catch (error) {
      console.error(`Error setting key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key to delete
   * @returns {Promise<number>} - Number of keys deleted
   */
  async del(key) {
    try {
      if (!key) {
        throw new Error('Key is required');
      }

      return await this.redis.del(key);
    } catch (error) {
      console.error(`Error deleting key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - True if key exists
   */
  async exists(key) {
    try {
      if (!key) {
        throw new Error('Key is required');
      }

      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking existence of key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Get TTL (time to live) for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} - TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
   */
  async ttl(key) {
    try {
      if (!key) {
        throw new Error('Key is required');
      }

      return await this.redis.ttl(key);
    } catch (error) {
      console.error(`Error getting TTL for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear all keys from current database
   * @returns {Promise<string>} - Redis response
   */
  async flush() {
    try {
      return await this.redis.flushdb();
    } catch (error) {
      console.error('Error flushing cache:', error);
      throw error;
    }
  }

  /**
   * Close Redis connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      await this.redis.quit();
      console.log('Redis connection closed gracefully');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
      throw error;
    }
  }

  /**
   * Get Redis client instance for advanced operations
   * @returns {Redis} - ioredis client instance
   */
  getClient() {
    return this.redis;
  }
}

// Singleton instance holder
let cacheInstance = null;

/**
 * Initialize cache store (call this in your main index.js)
 * @param {Object} options - Optional ioredis configuration options
 * @returns {CacheStore} - Cache store instance
 */
function initCache(options = {}) {
  if (cacheInstance === null) {
    cacheInstance = new CacheStore(options);
  }
  return cacheInstance;
}

/**
 * Get initialized cache instance (call this in other files)
 * @returns {CacheStore} - Cache store instance
 * @throws {Error} - If cache hasn't been initialized
 */
function getCache() {
  if (cacheInstance === null) {
    throw new Error('Cache not initialized. Call initCache() in your main index.js first.');
  }
  return cacheInstance;
}

module.exports = {
  initCache,
  getCache,
  CacheStore, // Export class for advanced usage if needed
};
