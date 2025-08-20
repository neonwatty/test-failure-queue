import { TestDatabase } from './database.js';
import { QueueItem, QueueOptions, QueueStatistics } from './types.js';
import { minimatch } from 'minimatch';
import { loadConfig } from './config.js';

export class TestFailureQueue {
  private db: TestDatabase;
  private options: QueueOptions;

  constructor(options: QueueOptions = {}) {
    const config = loadConfig(options.configPath);
    
    this.options = {
      databasePath: options.databasePath || config.databasePath,
      autoCleanup: options.autoCleanup ?? config.autoCleanup,
      maxRetries: options.maxRetries ?? config.maxRetries,
      configPath: options.configPath
    };
    
    this.db = new TestDatabase({
      path: this.options.databasePath,
      verbose: config.verbose || false
    });
  }

  enqueue(filePath: string, priority: number = 0, error?: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }
    
    if (!Number.isInteger(priority)) {
      throw new Error('Priority must be an integer');
    }

    this.db.enqueue(filePath, priority, error);
  }

  dequeue(): string | null {
    return this.db.dequeue();
  }

  peek(): string | null {
    return this.db.peek();
  }

  list(): QueueItem[] {
    return this.db.list();
  }

  remove(filePath: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }
    return this.db.remove(filePath);
  }

  clear(): void {
    this.db.clear();
  }

  size(): number {
    return this.db.size();
  }

  contains(filePath: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }
    return this.db.contains(filePath);
  }

  search(pattern: string): QueueItem[] {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('Pattern must be a non-empty string');
    }
    return this.db.search(pattern);
  }

  searchGlob(pattern: string): QueueItem[] {
    const allItems = this.db.list();
    return allItems.filter(item => minimatch(item.filePath, pattern));
  }

  getStats(): QueueStatistics {
    return this.db.getStats();
  }

  close(): void {
    this.db.close();
  }
}