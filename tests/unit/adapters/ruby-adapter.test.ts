import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { RubyAdapter } from '../../../src/adapters/ruby-adapter.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

describe('RubyAdapter', () => {
  let adapter: RubyAdapter;
  const mockFs = fs as any;
  
  beforeEach(() => {
    adapter = new RubyAdapter();
    vi.clearAllMocks();
  });
  
  describe('language and frameworks', () => {
    it('should have language set to ruby', () => {
      expect(adapter.language).toBe('ruby');
    });
    
    it('should support multiple frameworks', () => {
      expect(adapter.supportedFrameworks).toEqual(['minitest', 'rspec']);
    });
  });
  
  describe('detectFramework', () => {
    it('should detect minitest for Rails projects', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('Gemfile') || pathStr.endsWith('config/application.rb');
      });
      mockFs.readFileSync.mockReturnValue('gem "rails"\ngem "minitest"');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('minitest');
    });
    
    it('should default to minitest when test directory exists', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('/test');
      });
      mockFs.readFileSync.mockReturnValue('');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('minitest');
    });
    
    it('should return null when no indicators found', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBeNull();
    });
  });
  
  describe('getTestCommand', () => {
    it('should return rails test for minitest', () => {
      // Mock Rails detection
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('config/application.rb') || pathStr.endsWith('bin/rails');
      });
      expect(adapter.getTestCommand('minitest')).toBe('rails test');
    });
    
    it('should return rails test with path for minitest', () => {
      // Mock Rails detection
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('config/application.rb') || pathStr.endsWith('bin/rails');
      });
      expect(adapter.getTestCommand('minitest', 'test/models/user_test.rb')).toBe('rails test test/models/user_test.rb');
    });
    
    it('should handle unknown framework', () => {
      expect(adapter.getTestCommand('unknown')).toBe('rake test');
    });
  });
  
  describe('parseTestOutput - Minitest', () => {
    it('should parse minitest failure output', () => {
      const output = `
        Failure:
        UserTest#test_validation [test/models/user_test.rb:45]:
        Expected true to be false
        
        rails test test/models/user_test.rb:45
        
        10 runs, 15 assertions, 1 failures, 0 errors, 2 skips
      `;
      
      const result = adapter.parseTestOutput(output, 'minitest');
      expect(result.passed).toBe(false);
      // The output only has one clear failure pattern - the rails test command
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].file).toBe('test/models/user_test.rb');
      expect(result.failures[0].line).toBe(45);
      expect(result.summary).toEqual({
        total: 10,
        passed: 7,
        failed: 1,
        skipped: 2
      });
    });
    
    it('should parse minitest error output', () => {
      const output = `
        Error:
        UserTest#test_creation:
        NoMethodError: undefined method
        test/models/user_test.rb:30:in 'test_creation'
        
        10 runs, 15 assertions, 0 failures, 1 errors, 0 skips
      `;
      
      const result = adapter.parseTestOutput(output, 'minitest');
      // The summary correctly shows 1 error which counts as 1 failed
      expect(result.summary.failed).toBe(1);  // errors count as failures
      expect(result.summary.total).toBe(10);
      expect(result.summary.passed).toBe(9);
    });
  });
  
  describe('validateFramework', () => {
    it('should validate supported frameworks', () => {
      expect(adapter.validateFramework('minitest')).toBe(true);
      expect(adapter.validateFramework('rspec')).toBe(true);
    });
    
    it('should reject unsupported frameworks', () => {
      expect(adapter.validateFramework('unknown')).toBe(false);
    });
    
    it('should be case-insensitive', () => {
      expect(adapter.validateFramework('MINITEST')).toBe(true);
      expect(adapter.validateFramework('RSPEC')).toBe(true);
    });
  });
});