import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestDatabase } from '../../src/core/database.js';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Database Concurrency Protection', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfq-db-concurrency-'));
    dbPath = path.join(tempDir, 'test.db');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  it('should enable WAL mode for better concurrency', () => {
    const db = new TestDatabase({ path: dbPath });
    
    // Check WAL mode is enabled
    const rawDb = new Database(dbPath, { readonly: true });
    const journalMode = rawDb.pragma('journal_mode');
    rawDb.close();
    
    // pragma returns an array with an object
    expect(journalMode[0].journal_mode).toBe('wal');
  });

  it('should set busy timeout for concurrent access', () => {
    const db = new TestDatabase({ path: dbPath });
    
    // Check busy timeout is set
    const rawDb = new Database(dbPath, { readonly: true });
    const busyTimeout = rawDb.pragma('busy_timeout');
    rawDb.close();
    
    // pragma returns an array with an object
    expect(busyTimeout[0].timeout).toBe(5000);
  });

  it('should handle concurrent writes without errors', async () => {
    const db1 = new TestDatabase({ path: dbPath });
    
    // Add some test data
    db1.enqueue('test1.js', 1);
    db1.enqueue('test2.js', 2);
    
    // Create second connection
    const db2 = new TestDatabase({ path: dbPath });
    
    // Both should be able to read
    const list1 = db1.list();
    const list2 = db2.list();
    
    expect(list1.length).toBe(2);
    expect(list2.length).toBe(2);
    
    // Sequential writes should work (WAL mode allows this)
    db1.enqueue('test3.js', 3);
    db2.enqueue('test4.js', 4);
    
    const finalList = db1.list();
    expect(finalList.length).toBe(4);
  });

  it('should have WAL files created', () => {
    const db = new TestDatabase({ path: dbPath });
    db.enqueue('test.js', 1);
    
    // Check for WAL files
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    
    expect(fs.existsSync(walPath)).toBe(true);
    expect(fs.existsSync(shmPath)).toBe(true);
  });
});