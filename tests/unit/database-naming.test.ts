import { describe, it, expect, afterEach, vi } from 'vitest';
import { TestDatabase } from '../../src/core/database.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Database Naming', () => {
  const testHomeDir = path.join(os.tmpdir(), 'tfq-test-home');
  
  afterEach(() => {
    // Clean up any test databases
    if (fs.existsSync(testHomeDir)) {
      fs.rmSync(testHomeDir, { recursive: true });
    }
  });

  it('should create database with tfq.db name by default', () => {
    // Override HOME directory for test
    const originalHome = os.homedir();
    vi.spyOn(os, 'homedir').mockReturnValue(testHomeDir);
    
    try {
      const db = new TestDatabase();
      
      // Check that the database file was created with the correct name
      const expectedPath = path.join(testHomeDir, '.tfq', 'tfq.db');
      expect(fs.existsSync(expectedPath)).toBe(true);
      
      db.close();
    } finally {
      // Restore original home directory
      vi.restoreAllMocks();
    }
  });

  it('should use tfq.db in custom path when specified', () => {
    const customPath = path.join(testHomeDir, 'custom-tfq.db');
    
    const db = new TestDatabase({ path: customPath });
    
    expect(fs.existsSync(customPath)).toBe(true);
    expect(customPath.endsWith('tfq.db')).toBe(true);
    
    db.close();
  });

  it('should use tfq.db pattern in environment variable', () => {
    const envPath = path.join(testHomeDir, 'env-tfq.db');
    const originalEnv = process.env.TFQ_DB_PATH;
    
    try {
      process.env.TFQ_DB_PATH = envPath;
      
      const db = new TestDatabase();
      
      expect(fs.existsSync(envPath)).toBe(true);
      expect(envPath.endsWith('tfq.db')).toBe(true);
      
      db.close();
    } finally {
      // Restore original environment
      if (originalEnv) {
        process.env.TFQ_DB_PATH = originalEnv;
      } else {
        delete process.env.TFQ_DB_PATH;
      }
    }
  });
});