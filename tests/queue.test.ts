import { TestFailureQueue } from '../src/queue';
import * as fs from 'fs';
import * as path from 'path';

describe('TestFailureQueue', () => {
  let queue: TestFailureQueue;
  const testDbPath = path.join(__dirname, '../test-queue.db');

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    queue = new TestFailureQueue({
      databasePath: testDbPath
    });
  });

  afterEach(() => {
    queue.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('enqueue and dequeue', () => {
    it('should add and retrieve files in FIFO order', () => {
      queue.enqueue('test1.js');
      queue.enqueue('test2.js');
      queue.enqueue('test3.js');

      expect(queue.dequeue()).toBe('test1.js');
      expect(queue.dequeue()).toBe('test2.js');
      expect(queue.dequeue()).toBe('test3.js');
      expect(queue.dequeue()).toBeNull();
    });

    it('should respect priority order', () => {
      queue.enqueue('low.js', 0);
      queue.enqueue('high.js', 10);
      queue.enqueue('medium.js', 5);

      expect(queue.dequeue()).toBe('high.js');
      expect(queue.dequeue()).toBe('medium.js');
      expect(queue.dequeue()).toBe('low.js');
    });

    it('should handle duplicate files by incrementing failure count', () => {
      queue.enqueue('test.js');
      queue.enqueue('test.js'); // Duplicate
      
      const items = queue.list();
      expect(items.length).toBe(1);
      expect(items[0].failureCount).toBe(2);
    });

    it('should throw error for invalid input', () => {
      expect(() => queue.enqueue('')).toThrow('File path must be a non-empty string');
      expect(() => queue.enqueue(null as any)).toThrow('File path must be a non-empty string');
    });
  });

  describe('peek', () => {
    it('should return next file without removing it', () => {
      queue.enqueue('test1.js');
      queue.enqueue('test2.js');

      expect(queue.peek()).toBe('test1.js');
      expect(queue.peek()).toBe('test1.js'); // Should still be there
      expect(queue.size()).toBe(2);
    });

    it('should return null for empty queue', () => {
      expect(queue.peek()).toBeNull();
    });
  });

  describe('list', () => {
    it('should return all items in priority order', () => {
      queue.enqueue('low.js', 1);
      queue.enqueue('high.js', 10);
      queue.enqueue('medium.js', 5);

      const items = queue.list();
      expect(items.length).toBe(3);
      expect(items[0].filePath).toBe('high.js');
      expect(items[1].filePath).toBe('medium.js');
      expect(items[2].filePath).toBe('low.js');
    });

    it('should return empty array for empty queue', () => {
      expect(queue.list()).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should remove specific file from queue', () => {
      queue.enqueue('test1.js');
      queue.enqueue('test2.js');
      queue.enqueue('test3.js');

      expect(queue.remove('test2.js')).toBe(true);
      expect(queue.size()).toBe(2);
      expect(queue.contains('test2.js')).toBe(false);
    });

    it('should return false when file not found', () => {
      queue.enqueue('test.js');
      expect(queue.remove('nonexistent.js')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all items from queue', () => {
      queue.enqueue('test1.js');
      queue.enqueue('test2.js');
      queue.enqueue('test3.js');

      queue.clear();
      expect(queue.size()).toBe(0);
      expect(queue.list()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return correct queue size', () => {
      expect(queue.size()).toBe(0);
      
      queue.enqueue('test1.js');
      expect(queue.size()).toBe(1);
      
      queue.enqueue('test2.js');
      expect(queue.size()).toBe(2);
      
      queue.dequeue();
      expect(queue.size()).toBe(1);
    });
  });

  describe('contains', () => {
    it('should check if file exists in queue', () => {
      queue.enqueue('test.js');
      
      expect(queue.contains('test.js')).toBe(true);
      expect(queue.contains('other.js')).toBe(false);
    });
  });

  describe('search', () => {
    it('should find files matching pattern', () => {
      queue.enqueue('tests/api/users.js');
      queue.enqueue('tests/api/posts.js');
      queue.enqueue('tests/auth/login.js');

      const apiTests = queue.search('api');
      expect(apiTests.length).toBe(2);
      expect(apiTests[0].filePath).toContain('api');
      expect(apiTests[1].filePath).toContain('api');
    });

    it('should return empty array when no matches', () => {
      queue.enqueue('test.js');
      expect(queue.search('xyz')).toEqual([]);
    });
  });

  describe('searchGlob', () => {
    it('should find files matching glob pattern', () => {
      queue.enqueue('/path/tests/api/users.js');
      queue.enqueue('/path/tests/api/posts.ts');
      queue.enqueue('/path/tests/auth/login.js');

      const jsTests = queue.searchGlob('**/*.js');
      expect(jsTests.length).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      queue.enqueue('test1.js', 10);
      queue.enqueue('test2.js', 10);
      queue.enqueue('test3.js', 5);
      queue.enqueue('test1.js'); // Duplicate to increase failure count

      const stats = queue.getStats();
      
      expect(stats.totalItems).toBe(3);
      expect(stats.averageFailureCount).toBeGreaterThan(1);
      expect(stats.oldestItem).not.toBeNull();
      expect(stats.newestItem).not.toBeNull();
      expect(stats.itemsByPriority.get(10)).toBe(2);
      expect(stats.itemsByPriority.get(5)).toBe(1);
    });

    it('should handle empty queue stats', () => {
      const stats = queue.getStats();
      
      expect(stats.totalItems).toBe(0);
      expect(stats.averageFailureCount).toBe(0);
      expect(stats.oldestItem).toBeNull();
      expect(stats.newestItem).toBeNull();
    });
  });
});