/**
 * Safe Storage Utility
 * 
 * Provides a safe wrapper around localStorage and sessionStorage that:
 * - Handles Safari private mode (storage unavailable)
 * - Handles storage quota exceeded errors
 * - Falls back to in-memory storage when needed
 * - Provides consistent error handling
 * - Supports serialization/deserialization
 */

import { logger } from './logger';

// interface StorageOptions {
//   serialize?: boolean;
// }

/**
 * Safe storage implementation with memory fallback
 */
class SafeStorage {
  private memoryFallback = new Map<string, string>();
  private storageAvailable = true;
  private storageType: 'localStorage' | 'sessionStorage';

  constructor(private storage: Storage, type: 'localStorage' | 'sessionStorage') {
    this.storageType = type;
    this.checkAvailability();
  }

  /**
   * Check if storage is available (Safari private mode test)
   */
  private checkAvailability(): void {
    try {
      const testKey = '__storage_test__';
      this.storage.setItem(testKey, testKey);
      this.storage.removeItem(testKey);
      this.storageAvailable = true;
    } catch (e) {
      this.storageAvailable = false;
      logger.warn(`${this.storageType} unavailable, using memory fallback`, {
        context: 'SafeStorage',
        data: { error: e instanceof Error ? e.message : 'Unknown error' },
      });
    }
  }

  /**
   * Get item from storage
   */
  getItem(key: string): string | null {
    if (this.storageAvailable) {
      try {
        return this.storage.getItem(key);
      } catch (e) {
        logger.warn(`Failed to read from ${this.storageType}: ${key}`, {
          context: 'SafeStorage',
          data: { error: e instanceof Error ? e.message : 'Unknown error' },
        });
        this.storageAvailable = false;
      }
    }
    
    return this.memoryFallback.get(key) || null;
  }

  /**
   * Set item in storage
   */
  setItem(key: string, value: string): boolean {
    if (this.storageAvailable) {
      try {
        this.storage.setItem(key, value);
        return true;
      } catch (e) {
        // Check if it's a quota exceeded error
        const isQuotaError = e instanceof Error && (
          e.name === 'QuotaExceededError' ||
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
        );

        if (isQuotaError) {
          logger.warn(`${this.storageType} quota exceeded for key: ${key}`, {
            context: 'SafeStorage',
          });
          // Try to clear some space
          this.clearOldestItems();
          // Retry once
          try {
            this.storage.setItem(key, value);
            return true;
          } catch {
            this.storageAvailable = false;
          }
        } else {
          logger.warn(`Failed to write to ${this.storageType}: ${key}`, {
            context: 'SafeStorage',
            data: { error: e instanceof Error ? e.message : 'Unknown error' },
          });
          this.storageAvailable = false;
        }
      }
    }

    // Fallback to memory
    this.memoryFallback.set(key, value);
    return false;
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string): void {
    if (this.storageAvailable) {
      try {
        this.storage.removeItem(key);
      } catch (e) {
        logger.debug(`Failed to remove from ${this.storageType}: ${key}`, {
          context: 'SafeStorage',
        });
      }
    }
    this.memoryFallback.delete(key);
  }

  /**
   * Clear all items from storage
   */
  clear(): void {
    if (this.storageAvailable) {
      try {
        this.storage.clear();
      } catch (e) {
        logger.warn(`Failed to clear ${this.storageType}`, {
          context: 'SafeStorage',
        });
      }
    }
    this.memoryFallback.clear();
  }

  /**
   * Get all keys from storage
   */
  keys(): string[] {
    if (this.storageAvailable) {
      try {
        return Object.keys(this.storage);
      } catch (e) {
        logger.debug(`Failed to get keys from ${this.storageType}`, {
          context: 'SafeStorage',
        });
      }
    }
    return Array.from(this.memoryFallback.keys());
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.getItem(key) !== null;
  }

  /**
   * Get and parse JSON object
   */
  getObject<T = any>(key: string, defaultValue?: T): T | null {
    const item = this.getItem(key);
    if (!item) return defaultValue || null;

    try {
      return JSON.parse(item) as T;
    } catch (e) {
      logger.warn(`Failed to parse JSON from ${this.storageType}: ${key}`, {
        context: 'SafeStorage',
      });
      return defaultValue || null;
    }
  }

  /**
   * Stringify and set JSON object
   */
  setObject(key: string, value: any): boolean {
    try {
      const json = JSON.stringify(value);
      return this.setItem(key, json);
    } catch (e) {
      logger.error(`Failed to stringify object for ${this.storageType}: ${key}`, e, {
        context: 'SafeStorage',
      });
      return false;
    }
  }

  /**
   * Get storage size in bytes (approximate)
   */
  getSize(): number {
    let size = 0;
    
    if (this.storageAvailable) {
      try {
        for (let i = 0; i < this.storage.length; i++) {
          const key = this.storage.key(i);
          if (key) {
            const value = this.storage.getItem(key);
            if (value) {
              size += key.length + value.length;
            }
          }
        }
      } catch (e) {
        logger.debug(`Failed to calculate ${this.storageType} size`, {
          context: 'SafeStorage',
        });
      }
    } else {
      // Calculate memory fallback size
      this.memoryFallback.forEach((value, key) => {
        size += key.length + value.length;
      });
    }

    return size * 2; // Multiply by 2 for UTF-16 encoding
  }

  /**
   * Clear oldest items to free up space (LRU-like)
   * Removes items starting with 'cache_' or 'temp_'
   */
  private clearOldestItems(): void {
    if (!this.storageAvailable) return;

    try {
      const keysToRemove: string[] = [];
      
      // Remove temporary/cache items first
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && (key.startsWith('cache_') || key.startsWith('temp_'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => this.storage.removeItem(key));
      
      logger.info(`Cleared ${keysToRemove.length} temporary items from ${this.storageType}`, {
        context: 'SafeStorage',
      });
    } catch (e) {
      logger.debug('Failed to clear old items', {
        context: 'SafeStorage',
      });
    }
  }

  /**
   * Check if using memory fallback
   */
  isUsingMemoryFallback(): boolean {
    return !this.storageAvailable;
  }
}

/**
 * Safe localStorage instance
 */
export const safeLocalStorage = new SafeStorage(
  typeof window !== 'undefined' ? window.localStorage : ({} as Storage),
  'localStorage'
);

/**
 * Safe sessionStorage instance
 */
export const safeSessionStorage = new SafeStorage(
  typeof window !== 'undefined' ? window.sessionStorage : ({} as Storage),
  'sessionStorage'
);

/**
 * Helper to migrate from unsafe localStorage to safe storage
 * Call this once during app initialization
 */
export function initializeSafeStorage(): void {
  // Check storage availability on init
  const localAvailable = !safeLocalStorage.isUsingMemoryFallback();
  const sessionAvailable = !safeSessionStorage.isUsingMemoryFallback();

  logger.info('Storage initialized', {
    context: 'SafeStorage',
    data: {
      localStorage: localAvailable ? 'available' : 'fallback',
      sessionStorage: sessionAvailable ? 'available' : 'fallback',
      localStorageSize: `${(safeLocalStorage.getSize() / 1024).toFixed(2)} KB`,
    },
  });
}

// Export both as named exports and default
export default {
  localStorage: safeLocalStorage,
  sessionStorage: safeSessionStorage,
  initialize: initializeSafeStorage,
};
