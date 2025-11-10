import NodeCache from 'node-cache';

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600000', 10); // 1 hour default
const MAX_CACHE_SIZE = parseInt(process.env.MAX_CACHE_SIZE || '1000', 10);

/**
 * In-memory cache service for explanation results
 */
class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: CACHE_TTL / 1000, // Convert ms to seconds
      maxKeys: MAX_CACHE_SIZE,
      useClones: false
    });
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {Object|null} Cached value or null
   */
  async get(key) {
    return this.cache.get(key) || null;
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {Object} value - Value to cache
   * @param {number} ttl - Optional TTL in milliseconds
   */
  async set(key, value, ttl = null) {
    const ttlSeconds = ttl ? ttl / 1000 : undefined;
    return this.cache.set(key, value, ttlSeconds);
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   */
  async delete(key) {
    return this.cache.del(key);
  }

  /**
   * Clear all cache
   */
  async clear() {
    return this.cache.flushAll();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return this.cache.getStats();
  }
}

export const cacheService = new CacheService();

