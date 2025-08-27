import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { DatabaseConfig, QueueItem } from './types.js';

export class TestDatabase {
  private db: Database.Database;
  private readonly defaultPath = path.join(os.homedir(), '.tfq', 'tfq.db');

  constructor(config: DatabaseConfig = {}) {
    // Check environment variable first, then config, then default
    const dbPath = process.env.TFQ_DB_PATH || config.path || this.defaultPath;
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath, { 
      verbose: config.verbose ? console.log : undefined 
    });

    // Set busy timeout FIRST to handle concurrent access during initialization
    this.db.pragma('busy_timeout = 5000');
    
    // Enable WAL mode for better concurrency (allows multiple readers + one writer)
    this.db.pragma('journal_mode = WAL');

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
        last_failure DATETIME DEFAULT CURRENT_TIMESTAMP,
        error TEXT,
        group_id INTEGER DEFAULT NULL,
        group_type TEXT DEFAULT NULL,
        group_order INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_priority_created 
      ON failed_tests(priority DESC, created_at ASC);
      
      CREATE INDEX IF NOT EXISTS idx_group_id_order 
      ON failed_tests(group_id, group_order);
    `);
    
    // Add columns if they don't exist (for existing databases)
    const tableInfo = this.db.prepare("PRAGMA table_info(failed_tests)").all();
    const hasErrorColumn = tableInfo.some((col: any) => col.name === 'error');
    const hasGroupId = tableInfo.some((col: any) => col.name === 'group_id');
    const hasGroupType = tableInfo.some((col: any) => col.name === 'group_type');
    const hasGroupOrder = tableInfo.some((col: any) => col.name === 'group_order');
    
    if (!hasErrorColumn) {
      this.db.exec('ALTER TABLE failed_tests ADD COLUMN error TEXT');
    }
    if (!hasGroupId) {
      this.db.exec('ALTER TABLE failed_tests ADD COLUMN group_id INTEGER DEFAULT NULL');
    }
    if (!hasGroupType) {
      this.db.exec('ALTER TABLE failed_tests ADD COLUMN group_type TEXT DEFAULT NULL');
    }
    if (!hasGroupOrder) {
      this.db.exec('ALTER TABLE failed_tests ADD COLUMN group_order INTEGER DEFAULT 0');
    }
    
    // Create group index if it doesn't exist
    const indexInfo = this.db.prepare("PRAGMA index_list(failed_tests)").all();
    const hasGroupIndex = indexInfo.some((idx: any) => idx.name === 'idx_group_id_order');
    if (!hasGroupIndex) {
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_group_id_order ON failed_tests(group_id, group_order)');
    }
  }

  enqueue(filePath: string, priority: number = 0, error?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO failed_tests (file_path, priority, error) 
      VALUES (?, ?, ?)
      ON CONFLICT(file_path) DO UPDATE SET
        failure_count = failure_count + 1,
        last_failure = CURRENT_TIMESTAMP,
        priority = MAX(priority, excluded.priority),
        error = excluded.error
    `);
    
    stmt.run(filePath, priority, error || null);
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

  dequeueWithContext(): QueueItem | null {
    const transaction = this.db.transaction(() => {
      const row = this.db.prepare(`
        SELECT 
          id,
          file_path as filePath,
          priority,
          created_at as createdAt,
          failure_count as failureCount,
          last_failure as lastFailure,
          error,
          group_id as groupId,
          group_type as groupType,
          group_order as groupOrder
        FROM failed_tests 
        ORDER BY priority DESC, created_at ASC 
        LIMIT 1
      `).get() as any;

      if (row) {
        this.db.prepare('DELETE FROM failed_tests WHERE file_path = ?').run(row.filePath);
        return {
          ...row,
          createdAt: new Date(row.createdAt),
          lastFailure: new Date(row.lastFailure),
          error: row.error || undefined,
          groupId: row.groupId || undefined,
          groupType: row.groupType || undefined,
          groupOrder: row.groupOrder || undefined
        };
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
        last_failure as lastFailure,
        error,
        group_id as groupId,
        group_type as groupType,
        group_order as groupOrder
      FROM failed_tests 
      ORDER BY priority DESC, created_at ASC
    `).all() as any[];

    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      lastFailure: new Date(row.lastFailure),
      error: row.error || undefined,
      groupId: row.groupId || undefined,
      groupType: row.groupType || undefined,
      groupOrder: row.groupOrder || undefined
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
        lastFailure: new Date(oldest.last_failure),
        error: oldest.error || undefined
      };
    }

    if (newest) {
      stats.newestItem = {
        id: newest.id,
        filePath: newest.file_path,
        priority: newest.priority,
        createdAt: new Date(newest.created_at),
        failureCount: newest.failure_count,
        lastFailure: new Date(newest.last_failure),
        error: newest.error || undefined
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

  // Grouping methods
  setTestGroup(filePath: string, groupId: number, groupType: 'parallel' | 'sequential', order: number = 0): void {
    const stmt = this.db.prepare(`
      UPDATE failed_tests 
      SET group_id = ?, group_type = ?, group_order = ?
      WHERE file_path = ?
    `);
    stmt.run(groupId, groupType, order, filePath);
  }

  getTestsByGroup(groupId: number): QueueItem[] {
    const rows = this.db.prepare(`
      SELECT 
        id,
        file_path as filePath,
        priority,
        created_at as createdAt,
        failure_count as failureCount,
        last_failure as lastFailure,
        error,
        group_id as groupId,
        group_type as groupType,
        group_order as groupOrder
      FROM failed_tests 
      WHERE group_id = ?
      ORDER BY group_order ASC, created_at ASC
    `).all(groupId) as any[];

    return rows.map(row => ({
      ...row,
      createdAt: new Date(row.createdAt),
      lastFailure: new Date(row.lastFailure),
      error: row.error || undefined,
      groupId: row.groupId || undefined,
      groupType: row.groupType || undefined,
      groupOrder: row.groupOrder || undefined
    }));
  }

  getNextGroup(): { groupId: number; type: string; tests: QueueItem[] } | null {
    // Find the lowest group_id that still has tests
    const groupRow = this.db.prepare(`
      SELECT MIN(group_id) as groupId, group_type as type
      FROM failed_tests 
      WHERE group_id IS NOT NULL
      GROUP BY group_id
      ORDER BY group_id ASC
      LIMIT 1
    `).get() as { groupId: number; type: string } | undefined;

    if (!groupRow) {
      return null;
    }

    const tests = this.getTestsByGroup(groupRow.groupId);
    
    return {
      groupId: groupRow.groupId,
      type: groupRow.type,
      tests
    };
  }

  clearGroups(): void {
    this.db.prepare(`
      UPDATE failed_tests 
      SET group_id = NULL, group_type = NULL, group_order = 0
    `).run();
  }

  getGroupStats(): { totalGroups: number; parallelGroups: number; sequentialGroups: number } {
    const stats = {
      totalGroups: 0,
      parallelGroups: 0,
      sequentialGroups: 0
    };

    const rows = this.db.prepare(`
      SELECT group_type, COUNT(DISTINCT group_id) as count
      FROM failed_tests
      WHERE group_id IS NOT NULL
      GROUP BY group_type
    `).all() as { group_type: string; count: number }[];

    for (const row of rows) {
      if (row.group_type === 'parallel') {
        stats.parallelGroups = row.count;
      } else if (row.group_type === 'sequential') {
        stats.sequentialGroups = row.count;
      }
    }

    stats.totalGroups = stats.parallelGroups + stats.sequentialGroups;
    
    return stats;
  }

  dequeueGroup(): string[] {
    const transaction = this.db.transaction(() => {
      const group = this.getNextGroup();
      if (!group) {
        return [];
      }

      const filePaths = group.tests.map(t => t.filePath);
      
      // Remove all tests in this group
      const stmt = this.db.prepare('DELETE FROM failed_tests WHERE group_id = ?');
      stmt.run(group.groupId);
      
      return filePaths;
    });

    return transaction();
  }
}