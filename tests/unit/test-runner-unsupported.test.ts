import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { TestRunner } from '../../src/core/test-runner.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

vi.mock('fs');
vi.mock('child_process');

describe('TestRunner - Unsupported Framework Detection', () => {
  const mockFs = fs as any;
  const mockExecSync = execSync as any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('');
    
    // Mock console.error to suppress output during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('detectUnsupportedFrameworks', () => {
    it('should detect Django in Python projects', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('manage.py');
      });
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].framework).toBe('Django');
      expect(unsupported[0].language).toBe('Python');
      expect(unsupported[0].suggestion).toContain('pytest');
    });
    
    it('should detect Django from requirements.txt', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('requirements.txt');
      });
      mockFs.readFileSync.mockReturnValue('django==4.0.0\npillow==9.0.0');
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].framework).toBe('Django');
    });
    
    it('should detect nose2 in Python projects', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('requirements-dev.txt');
      });
      mockFs.readFileSync.mockReturnValue('nose2==0.10.0\nmock==4.0.0');
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].framework).toBe('nose2');
      expect(unsupported[0].language).toBe('Python');
      expect(unsupported[0].suggestion).toContain('pytest');
    });
    
    it('should detect RSpec in Ruby projects', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('Gemfile');
      });
      mockFs.readFileSync.mockReturnValue('gem "rspec"\ngem "rails"');
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].framework).toBe('RSpec');
      expect(unsupported[0].language).toBe('Ruby');
      expect(unsupported[0].suggestion).toContain('Minitest');
    });
    
    it('should detect RSpec from spec directory', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('/spec');
      });
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].framework).toBe('RSpec');
    });
    
    it('should detect Cucumber in Ruby projects', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('Gemfile');
      });
      mockFs.readFileSync.mockReturnValue('gem "cucumber"\ngem "capybara"');
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].framework).toBe('Cucumber');
      expect(unsupported[0].language).toBe('Ruby');
      expect(unsupported[0].suggestion).toContain('Minitest');
    });
    
    it('should detect Cucumber from features directory', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('/features');
      });
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].framework).toBe('Cucumber');
    });
    
    it('should detect Test::Unit in Ruby projects', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('Gemfile');
      });
      mockFs.readFileSync.mockReturnValue('gem "test-unit"\ngem "rails"');
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].framework).toBe('Test::Unit');
      expect(unsupported[0].language).toBe('Ruby');
      expect(unsupported[0].suggestion).toContain('Minitest');
    });
    
    it('should detect multiple unsupported frameworks', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('Gemfile') || 
               pathStr.endsWith('requirements.txt') ||
               pathStr.endsWith('/spec');
      });
      mockFs.readFileSync.mockImplementation((path: any) => {
        const pathStr = path.toString();
        if (pathStr.endsWith('Gemfile')) {
          return 'gem "rspec"\ngem "cucumber"';
        }
        if (pathStr.endsWith('requirements.txt')) {
          return 'django==4.0.0\nnose2==0.10.0';
        }
        return '';
      });
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(4);
      const frameworks = unsupported.map(u => u.framework);
      expect(frameworks).toContain('Django');
      expect(frameworks).toContain('nose2');
      expect(frameworks).toContain('RSpec');
      expect(frameworks).toContain('Cucumber');
    });
    
    it('should return empty array when no unsupported frameworks detected', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readFileSync.mockReturnValue('');
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(0);
    });
    
    it('should check pyproject.toml for Python dependencies', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('pyproject.toml');
      });
      mockFs.readFileSync.mockReturnValue('[tool.poetry.dependencies]\ndjango = "^4.0"');
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].framework).toBe('Django');
    });
    
    it('should check Pipfile for Python dependencies', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('Pipfile');
      });
      mockFs.readFileSync.mockReturnValue('[packages]\ndjango = "*"');
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].framework).toBe('Django');
    });
    
    it('should check Gemfile.lock for Ruby dependencies', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('Gemfile.lock');
      });
      mockFs.readFileSync.mockReturnValue('DEPENDENCIES\n  rspec-rails\n  cucumber-rails');
      
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      expect(unsupported).toHaveLength(2);
      const frameworks = unsupported.map(u => u.framework);
      expect(frameworks).toContain('RSpec');
      expect(frameworks).toContain('Cucumber');
    });
  });
  
  describe('TestRunner constructor with unsupported framework detection', () => {
    it('should exit when unsupported framework detected', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('manage.py');
      });
      
      expect(() => {
        new TestRunner({ language: 'python', framework: 'pytest' });
      }).toThrow('process.exit called');
      
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unsupported test frameworks detected'));
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Django'));
    });
    
    it('should not exit when skipUnsupportedCheck is true', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('manage.py') || pathStr.endsWith('package.json');
      });
      mockFs.readFileSync.mockReturnValue('{"name": "test"}');
      mockExecSync.mockReturnValue('test output' as any);
      
      expect(() => {
        new TestRunner({ 
          language: 'python', 
          framework: 'pytest',
          skipUnsupportedCheck: true 
        });
      }).not.toThrow();
    });
    
    it('should not exit when no unsupported frameworks detected', () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('package.json');
      });
      mockFs.readFileSync.mockReturnValue('{"name": "test"}');
      mockExecSync.mockReturnValue('test output' as any);
      
      expect(() => {
        new TestRunner({ language: 'javascript', framework: 'jest' });
      }).not.toThrow();
    });
  });
});