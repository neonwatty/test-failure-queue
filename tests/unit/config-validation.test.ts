import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../../src/core/config.js';
import { TfqConfig } from '../../src/core/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Config Validation', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfq-config-validation-'));
    configPath = path.join(tempDir, '.tfqrc');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('validateTfqConfig', () => {
    it('should accept valid configuration', () => {
      const manager = new ConfigManager();
      const config: TfqConfig = {
        language: 'javascript',
        framework: 'jest',
        database: {
          path: './.tfq/tfq.db'
        }
      };
      
      const error = manager.validateTfqConfig(config);
      expect(error).toBeNull();
    });

    it('should reject invalid language', () => {
      const manager = new ConfigManager();
      const config: TfqConfig = {
        language: 'invalid-lang' as any,
        framework: 'jest',
        database: {
          path: './.tfq/tfq.db'
        }
      };
      
      const error = manager.validateTfqConfig(config);
      expect(error).toContain("Unsupported language 'invalid-lang'");
      expect(error).toContain('Supported:');
    });

    it('should reject invalid framework for language', () => {
      const manager = new ConfigManager();
      const config: TfqConfig = {
        language: 'ruby',
        framework: 'jest', // Jest is not a Ruby framework
        database: {
          path: './.tfq/tfq.db'
        }
      };
      
      const error = manager.validateTfqConfig(config);
      expect(error).toContain("Unsupported framework 'jest' for ruby");
      expect(error).toContain('minitest');
      expect(error).toContain('rspec');
    });

    it('should accept config without language/framework', () => {
      const manager = new ConfigManager();
      const config: TfqConfig = {
        database: {
          path: './.tfq/tfq.db'
        },
        defaults: {
          autoAdd: true
        }
      };
      
      const error = manager.validateTfqConfig(config);
      expect(error).toBeNull();
    });

    it('should validate database path with non-existent parent directory', () => {
      const manager = new ConfigManager();
      const nonExistentPath = path.join(tempDir, 'deep', 'nested', 'path', 'tfq.db');
      const config: TfqConfig = {
        language: 'javascript',
        database: {
          path: nonExistentPath
        }
      };
      
      // This should pass because the parent can be created
      const error = manager.validateTfqConfig(config);
      expect(error).toBeNull(); // Path can be created, so no error
    });

    it('should detect invalid database path when parent is a file', () => {
      const manager = new ConfigManager();
      // Create a file where we'd expect a directory
      const filePath = path.join(tempDir, 'somefile');
      fs.writeFileSync(filePath, 'test');
      
      const config: TfqConfig = {
        language: 'javascript',
        database: {
          path: path.join(filePath, 'tfq.db') // Parent is a file, not a directory
        }
      };
      
      const error = manager.validateTfqConfig(config);
      expect(error).toBeTruthy();
      if (error) {
        expect(error).toContain('is not a directory');
      }
    });
  });

  describe('writeConfig with validation', () => {
    it('should write valid config successfully', () => {
      const manager = new ConfigManager();
      const config: TfqConfig = {
        language: 'python',
        framework: 'pytest',
        database: {
          path: './.tfq/tfq.db'
        }
      };
      
      expect(() => {
        manager.writeConfig(config, configPath);
      }).not.toThrow();
      
      expect(fs.existsSync(configPath)).toBe(true);
      const written = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(written.language).toBe('python');
      expect(written.framework).toBe('pytest');
    });

    it('should throw on invalid config', () => {
      const manager = new ConfigManager();
      const config: TfqConfig = {
        language: 'invalid' as any,
        framework: 'test',
        database: {
          path: './.tfq/tfq.db'
        }
      };
      
      expect(() => {
        manager.writeConfig(config, configPath);
      }).toThrow('Invalid configuration');
      
      expect(fs.existsSync(configPath)).toBe(false);
    });

    it('should throw with helpful message for invalid framework', () => {
      const manager = new ConfigManager();
      const config: TfqConfig = {
        language: 'javascript',
        framework: 'invalid-framework',
        database: {
          path: './.tfq/tfq.db'
        }
      };
      
      expect(() => {
        manager.writeConfig(config, configPath);
      }).toThrow(/Unsupported framework 'invalid-framework'/);
    });
  });
});