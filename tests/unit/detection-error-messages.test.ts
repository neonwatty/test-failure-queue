import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestAdapterRegistry } from '../../src/adapters/registry.js';
import { TestRunner } from '../../src/core/test-runner.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Detection Error Messages', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfq-detection-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('Registry detection hints', () => {
    it('should provide helpful hints for detection', () => {
      const registry = TestAdapterRegistry.getInstance();
      const hints = registry.getDetectionHints();
      
      expect(hints).toContain('Gemfile or Gemfile.lock (Ruby)');
      expect(hints).toContain('requirements.txt, setup.py, or pyproject.toml (Python)');
      expect(hints).toContain('package.json (JavaScript/TypeScript)');
      expect(hints).toContain('File extensions (.rb, .py, .go, .java, .js, .ts)');
    });
  });

  describe('TestRunner error messages', () => {
    it('should provide detailed error when auto-detect fails', () => {
      // Empty directory with no project indicators
      
      expect(() => {
        new TestRunner({ autoDetect: true });
      }).toThrow(/Could not auto-detect project language/);
      
      try {
        new TestRunner({ autoDetect: true });
      } catch (error: any) {
        expect(error.message).toContain('Checked for:');
        expect(error.message).toContain('Gemfile');
        expect(error.message).toContain('package.json');
        expect(error.message).toContain('requirements.txt');
        expect(error.message).toContain('Please specify --language explicitly');
      }
    });

    it('should detect successfully with project file', () => {
      // Create a package.json
      fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
      }));
      
      expect(() => {
        const runner = new TestRunner({ autoDetect: true });
        expect(runner.getLanguage()).toBe('javascript');
      }).not.toThrow();
    });
  });

  describe('Registry detection order', () => {
    it('should detect Ruby before JavaScript when both exist', () => {
      const registry = TestAdapterRegistry.getInstance();
      
      // Create both Gemfile and package.json
      fs.writeFileSync(path.join(tempDir, 'Gemfile'), 'source "https://rubygems.org"');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "test"}');
      
      const detected = registry.detectLanguage(tempDir);
      expect(detected).toBe('ruby');
    });

    it('should detect Python before JavaScript when both exist', () => {
      const registry = TestAdapterRegistry.getInstance();
      
      // Create both requirements.txt and package.json
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'pytest==7.0.0');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "test"}');
      
      const detected = registry.detectLanguage(tempDir);
      expect(detected).toBe('python');
    });

    it('should return null when no indicators exist', () => {
      const registry = TestAdapterRegistry.getInstance();
      
      const detected = registry.detectLanguage(tempDir);
      expect(detected).toBeNull();
    });
  });
});