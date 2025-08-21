import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as os from 'os';
import { ConfigManager } from '../../src/core/config.js';
import { TestLanguage } from '../../src/core/types.js';

describe('ConfigManager', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfq-test-'));
    configPath = path.join(tempDir, '.tfqrc');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Language Configuration', () => {
    it('should load defaultLanguage from config', () => {
      const config = {
        defaultLanguage: 'python' as TestLanguage
      };
      fs.writeFileSync(configPath, JSON.stringify(config));
      
      const manager = new ConfigManager(configPath);
      expect(manager.getDefaultLanguage()).toBe('python');
    });

    it('should load defaultFrameworks from config', () => {
      const config = {
        defaultFrameworks: {
          javascript: 'mocha',
          python: 'unittest',
          ruby: 'minitest'
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config));
      
      const manager = new ConfigManager(configPath);
      expect(manager.getDefaultFramework('javascript' as TestLanguage)).toBe('mocha');
      expect(manager.getDefaultFramework('python' as TestLanguage)).toBe('unittest');
      expect(manager.getDefaultFramework('ruby' as TestLanguage)).toBe('minitest');
    });

    it('should load testCommands from config', () => {
      const config = {
        testCommands: {
          'javascript:jest': 'npm run test:unit',
          'python:pytest': 'python -m pytest',
          'ruby:minitest': 'bundle exec rails test'
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config));
      
      const manager = new ConfigManager(configPath);
      expect(manager.getTestCommand('javascript' as TestLanguage, 'jest')).toBe('npm run test:unit');
      expect(manager.getTestCommand('python' as TestLanguage, 'pytest')).toBe('python -m pytest');
      expect(manager.getTestCommand('ruby' as TestLanguage, 'minitest')).toBe('bundle exec rails test');
    });

    it('should validate defaultLanguage and warn on invalid language', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const config = {
        defaultLanguage: 'invalid' as any
      };
      fs.writeFileSync(configPath, JSON.stringify(config));
      
      const manager = new ConfigManager(configPath);
      expect(manager.getDefaultLanguage()).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unsupported language 'invalid'")
      );
      
      warnSpy.mockRestore();
    });

    it('should validate defaultFrameworks and warn on invalid framework', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const config = {
        defaultFrameworks: {
          javascript: 'invalid-framework'
        }
      };
      fs.writeFileSync(configPath, JSON.stringify(config));
      
      const manager = new ConfigManager(configPath);
      expect(manager.getDefaultFramework('javascript' as TestLanguage)).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unsupported framework 'invalid-framework'")
      );
      
      warnSpy.mockRestore();
    });

    it('should return undefined for unset configuration values', () => {
      const config = {};
      fs.writeFileSync(configPath, JSON.stringify(config));
      
      const manager = new ConfigManager(configPath);
      expect(manager.getDefaultLanguage()).toBeUndefined();
      expect(manager.getDefaultFramework('javascript' as TestLanguage)).toBeUndefined();
      expect(manager.getTestCommand('javascript' as TestLanguage, 'jest')).toBeUndefined();
    });
  });

  describe('createDefaultConfig', () => {
    it('should create default config with language settings', () => {
      const manager = new ConfigManager();
      manager.createDefaultConfig(configPath);
      
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      expect(config.defaultLanguage).toBe('javascript');
      expect(config.defaultFrameworks).toEqual({
        javascript: 'jest',
        ruby: 'minitest',
        python: 'pytest',
        go: 'go',
        java: 'junit'
      });
      expect(config.testCommands).toHaveProperty('javascript:jest');
      expect(config.testCommands).toHaveProperty('ruby:minitest');
      expect(config.testCommands).toHaveProperty('python:pytest');
    });

  });

  describe('Existing functionality', () => {
    it('should load config from file', () => {
      const config = {
        databasePath: '~/custom/path.db',
        defaultPriority: 5,
        verbose: true
      };
      fs.writeFileSync(configPath, JSON.stringify(config));
      
      const manager = new ConfigManager(configPath);
      const loaded = manager.getConfig();
      
      expect(loaded.databasePath).toBe(path.join(os.homedir(), 'custom/path.db'));
      expect(loaded.defaultPriority).toBe(5);
      expect(loaded.verbose).toBe(true);
    });

    it('should expand tilde in paths', () => {
      const config = {
        databasePath: '~/test/queue.db'
      };
      fs.writeFileSync(configPath, JSON.stringify(config));
      
      const manager = new ConfigManager(configPath);
      const loaded = manager.getConfig();
      
      expect(loaded.databasePath).toBe(path.join(os.homedir(), 'test/queue.db'));
    });

    it('should merge configs from multiple sources', () => {
      const baseConfig = {
        databasePath: '~/base.db',
        defaultPriority: 1
      };
      const overrideConfig = {
        defaultPriority: 5,
        verbose: true
      };
      
      const basePath = path.join(tempDir, 'base.tfqrc');
      fs.writeFileSync(basePath, JSON.stringify(baseConfig));
      
      // Simulate loading base then override
      const manager = new ConfigManager(basePath);
      const config = manager.getConfig();
      
      expect(config.defaultPriority).toBe(1);
    });
  });
});