import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DatabaseConfig, QueueItem } from './types';

export class TestDatabase {
  private db: Database.Database;
  private readonly defaultPath = path.join(os.homedir(), '.tfq', 'queue.db');

  constructor(config: DatabaseConfig = {}) {
    const dbPath = config.path || this.defaultPath;
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath, { 
      verbose: config.verbose ? console.log : undefined 
    });

    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS failed_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        priority INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        failure_count INTEGER DEFAULT 1,
        last_failure DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_priority_created 
      ON failed_tests(priority DESC, created_at ASC);
    `);
  }

  enqueue(filePath: string, priority: number = 0): void {
    const stmt = this.db.prepare(`
      INSERT INTO failed_tests (file_path, priority) 
      VALUES (?, ?)
      ON CONFLICT(file_path) DO UPDATE SET
        failure_count = failure_count + 1,
        last_failure = CURRENT_TIMESTAMP,
        priority = MAX(priority, excluded.priority)
    `);
    
    stmt.run(filePath, priority);
  }

  dequeue(): string | null {
    const transaction = this.db.transaction(() => {
      const row = this.db.prepare(`
        SELECT file_path FROM failed_tests 
        ORDER BY priority DESC, created_at ASC 
        LIMIT 1
      `).get() as { file_path: string } | undefined;

      if (row) {
        this.db.prepare('DELETE FROM failed_tests WHERE file_path = ?').run(row.file_path);
        return row.file_path;
      }
      return null;
    });

    return transaction();
  }

  peek(): string | null {
    const row = this.db.prepare(`
      SELECT file_path FROM failed_tests 
      ORDER BY priority DESC, created_at ASC 
      LIMIT 1
    `).get() as { file_path: string } | undefined;

    return row ? row.file_path : null;
  }

  list(): QueueItem[] {
    const rows = this.db.prepare(`
      SELECT 
        id,
        file_path as filePath,
        priority,
        created_at as createdAt,
        failure_count as failureCount,
        last_failure as lastFailure
      FROM failed_tests 
      ORDER BY priority DESC, created_at ASC
    `).all() as any[];

    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      lastFailure: new Date(row.lastFailure)
    }));
  }

  remove(filePath: string): boolean {
    const result = this.db.prepare('DELETE FROM failed_tests WHERE file_path = ?').run(filePath);
    return result.changes > 0;
  }

  clear(): void {
    this.db.prepare('DELETE FROM failed_tests').run();
  }

  size(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM failed_tests').get() as { count: number };
    return row.count;
  }

  contains(filePath: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM failed_tests WHERE file_path = ? LIMIT 1').get(filePath);
    return !!row;
  }

  search(pattern: string): QueueItem[] {
    const rows = this.db.prepare(`
      SELECT 
        id,
        file_path as filePath,
        priority,
        created_at as createdAt,
        failure_count as failureCount,
        last_failure as lastFailure
      FROM failed_tests 
      WHERE file_path LIKE ?
      ORDER BY priority DESC, created_at ASC
    `).all(`%${pattern}%`) as any[];

    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      lastFailure: new Date(row.lastFailure)
    }));
  }

  getStats(): any {
    const stats = {
      totalItems: this.size(),
      oldestItem: null as QueueItem | null,
      newestItem: null as QueueItem | null,
      averageFailureCount: 0,
      itemsByPriority: new Map<number, number>()
    };

    const oldest = this.db.prepare(`
      SELECT * FROM failed_tests 
      ORDER BY created_at ASC LIMIT 1
    `).get() as any;

    const newest = this.db.prepare(`
      SELECT * FROM failed_tests 
      ORDER BY created_at DESC LIMIT 1
    `).get() as any;

    const avgRow = this.db.prepare(`
      SELECT AVG(failure_count) as avg FROM failed_tests
    `).get() as { avg: number | null };

    const priorityRows = this.db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM failed_tests 
      GROUP BY priority
    `).all() as { priority: number; count: number }[];

    if (oldest) {
      stats.oldestItem = {
        id: oldest.id,
        filePath: oldest.file_path,
        priority: oldest.priority,
        createdAt: new Date(oldest.created_at),
        failureCount: oldest.failure_count,
        lastFailure: new Date(oldest.last_failure)
      };
    }

    if (newest) {
      stats.newestItem = {
        id: newest.id,
        filePath: newest.file_path,
        priority: newest.priority,
        createdAt: new Date(newest.created_at),
        failureCount: newest.failure_count,
        lastFailure: new Date(newest.last_failure)
      };
    }

    stats.averageFailureCount = avgRow.avg || 0;

    priorityRows.forEach(row => {
      stats.itemsByPriority.set(row.priority, row.count);
    });

    return stats;
  }

  close(): void {
    this.db.close();
  }
}