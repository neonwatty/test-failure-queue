import { RubyAdapter } from '../../src/adapters/ruby-adapter';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('RubyAdapter', () => {
  let adapter: RubyAdapter;
  const mockFs = fs as jest.Mocked<typeof fs>;
  
  beforeEach(() => {
    adapter = new RubyAdapter();
    jest.clearAllMocks();
  });
  
  describe('language and frameworks', () => {
    it('should have language set to ruby', () => {
      expect(adapter.language).toBe('ruby');
    });
    
    it('should support multiple frameworks', () => {
      expect(adapter.supportedFrameworks).toEqual(['minitest', 'rspec', 'test-unit', 'cucumber']);
    });
  });
  
  describe('detectFramework', () => {
    it('should detect rspec from Gemfile', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('Gemfile');
      });
      mockFs.readFileSync.mockReturnValue('gem "rspec"');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('rspec');
    });
    
    it('should detect rspec from spec directory', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('/spec');
      });
      mockFs.readFileSync.mockReturnValue('');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('rspec');
    });
    
    it('should detect minitest for Rails projects', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('Gemfile') || pathStr.endsWith('config/application.rb');
      });
      mockFs.readFileSync.mockReturnValue('gem "rails"\ngem "minitest"');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('minitest');
    });
    
    it('should detect cucumber from features directory', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('/features');
      });
      mockFs.readFileSync.mockReturnValue('');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('cucumber');
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
      expect(adapter.getTestCommand('minitest')).toBe('rails test');
    });
    
    it('should return rails test with path for minitest', () => {
      expect(adapter.getTestCommand('minitest', 'test/models/user_test.rb')).toBe('rails test test/models/user_test.rb');
    });
    
    it('should return bundle exec rspec for rspec', () => {
      expect(adapter.getTestCommand('rspec')).toBe('bundle exec rspec');
    });
    
    it('should return bundle exec cucumber for cucumber', () => {
      expect(adapter.getTestCommand('cucumber')).toBe('bundle exec cucumber');
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
  
  describe('parseTestOutput - RSpec', () => {
    it('should parse rspec failure output', () => {
      const output = `
        Failures:
        
        1) User validation should validate email format
           Failure/Error: expect(user).to be_valid
           
           # ./spec/models/user_spec.rb:10:in 'block (3 levels) in <top (required)>'
        
        Failed examples:
        
        rspec ./spec/models/user_spec.rb:10
        
        15 examples, 2 failures, 1 pending
      `;
      
      const result = adapter.parseTestOutput(output, 'rspec');
      expect(result.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
      expect(result.summary).toEqual({
        total: 15,
        passed: 12,
        failed: 2,
        skipped: 1
      });
    });
  });
  
  describe('parseTestOutput - Cucumber', () => {
    it('should parse cucumber failure output', () => {
      const output = `
        Failing Scenarios:
        features/login.feature:10 # Scenario: Invalid login
        
        10 scenarios (2 failed, 8 passed)
        45 steps (2 failed, 43 passed)
      `;
      
      const result = adapter.parseTestOutput(output, 'cucumber');
      expect(result.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
      expect(result.summary.failed).toBe(2);
      expect(result.summary.passed).toBe(8);
      expect(result.summary.total).toBe(10);
    });
  });
  
  describe('validateFramework', () => {
    it('should validate supported frameworks', () => {
      expect(adapter.validateFramework('minitest')).toBe(true);
      expect(adapter.validateFramework('rspec')).toBe(true);
      expect(adapter.validateFramework('test-unit')).toBe(true);
      expect(adapter.validateFramework('cucumber')).toBe(true);
    });
    
    it('should reject unsupported frameworks', () => {
      expect(adapter.validateFramework('unknown')).toBe(false);
    });
    
    it('should be case-insensitive', () => {
      expect(adapter.validateFramework('RSpec')).toBe(true);
      expect(adapter.validateFramework('MINITEST')).toBe(true);
    });
  });
});