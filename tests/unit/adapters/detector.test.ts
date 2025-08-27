import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedDetector } from '../../../src/adapters/detector.js';
import fs from 'fs';
import path from 'path';
import { TestLanguage, TestFramework } from '../../../src/core/types.js';

// Mock fs module
vi.mock('fs');
const mockFs = vi.mocked(fs);

// Mock path module
vi.mock('path');
const mockPath = vi.mocked(path);

describe('EnhancedDetector', () => {
  let detector: EnhancedDetector;
  const mockProjectPath = '/mock/project';

  beforeEach(() => {
    detector = new EnhancedDetector();
    vi.clearAllMocks();

    // Setup default path mocks
    mockPath.join.mockImplementation((...paths) => paths.join('/'));
    mockPath.extname.mockImplementation((filePath) => {
      const parts = filePath.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detectProject', () => {
    it('should return null when no language is detected', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([]);

      const result = detector.detectProject(mockProjectPath);

      expect(result).toBeNull();
    });

    it('should detect JavaScript project with framework', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json') || filePath.includes('jest.config.js');
      });

      const mockPackageJson = {
        dependencies: { jest: '^29.0.0' },
        scripts: { test: 'jest' }
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = detector.detectProject(mockProjectPath);

      expect(result).toEqual({
        language: 'javascript',
        framework: 'jest',
        confidence: 90
      });
    });

    it('should detect language without framework', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });
      mockFs.readFileSync.mockReturnValue('{}');

      const result = detector.detectProject(mockProjectPath);

      expect(result).toEqual({
        language: 'javascript',
        framework: null,
        confidence: 70
      });
    });
  });

  describe('JavaScript/TypeScript Detection', () => {
    beforeEach(() => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });
    });

    it('should detect Vitest from config files', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json') || filePath.includes('vitest.config.ts');
      });
      mockFs.readFileSync.mockReturnValue('{}');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('vitest');
      expect(result?.confidence).toBe(90);
    });

    it('should detect Jest from config files', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json') || filePath.includes('jest.config.js');
      });
      mockFs.readFileSync.mockReturnValue('{}');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('jest');
    });

    it('should detect framework from package.json dependencies', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });

      const mockPackageJson = {
        devDependencies: { vitest: '^1.0.0' }
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('vitest');
    });

    it('should detect framework from test script', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });

      const mockPackageJson = {
        scripts: { test: 'mocha test/**/*.js' }
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('mocha');
    });

    it('should handle malformed package.json gracefully', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });
      mockFs.readFileSync.mockReturnValue('invalid json');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.language).toBe('javascript');
      expect(result?.framework).toBeNull();
    });

    it('should detect all supported JavaScript frameworks', () => {
      const frameworks = [
        { config: 'vitest.config.js', expected: 'vitest' },
        { config: 'jest.config.ts', expected: 'jest' },
        { config: '.mocharc.json', expected: 'mocha' },
        { config: 'jasmine.json', expected: 'jasmine' },
        { config: 'ava.config.js', expected: 'ava' }
      ];

      frameworks.forEach(({ config, expected }) => {
        vi.clearAllMocks();
        mockFs.existsSync.mockImplementation((filePath: string) => {
          return filePath.includes('package.json') || filePath.includes(config);
        });
        mockFs.readFileSync.mockReturnValue('{}');

        const result = detector.detectProject(mockProjectPath);

        expect(result?.framework).toBe(expected);
      });
    });
  });

  describe('Python Detection', () => {
    it('should detect Python from requirements.txt', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('requirements.txt');
      });

      const result = detector.detectProject(mockProjectPath);

      expect(result?.language).toBe('python');
    });

    it('should detect Python from pyproject.toml', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('pyproject.toml');
      });

      const result = detector.detectProject(mockProjectPath);

      expect(result?.language).toBe('python');
    });

    it('should detect pytest from config files', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('requirements.txt') || filePath.includes('pytest.ini');
      });
      mockFs.readFileSync.mockReturnValue('[tool:pytest]\naddopts = -v');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('pytest');
    });

    it('should detect pytest from pyproject.toml', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('pyproject.toml');
      });
      mockFs.readFileSync.mockReturnValue('[tool.pytest.ini_options]\ntestpaths = ["tests"]');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('pytest');
    });

    it('should detect Django framework', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('requirements.txt') || filePath.includes('manage.py');
      });
      mockFs.readFileSync.mockReturnValue('django>=4.0.0');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('django');
    });

    it('should default to pytest for Python projects', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('requirements.txt');
      });
      mockFs.readFileSync.mockReturnValue('requests>=2.0.0');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('pytest');
    });
  });

  describe('Ruby Detection', () => {
    it('should detect Ruby from Gemfile', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('Gemfile');
      });

      const result = detector.detectProject(mockProjectPath);

      expect(result?.language).toBe('ruby');
    });

    it('should detect RSpec from config files', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('Gemfile') || 
               filePath.includes('.rspec') || 
               filePath.includes('spec');
      });

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('rspec');
    });

    it('should detect Rails with Minitest', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('Gemfile') || 
               filePath.includes('Rakefile') ||
               filePath.includes('config/application.rb');
      });
      mockFs.readFileSync.mockReturnValue('Rails.application.load_tasks');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('minitest');
    });

    it('should detect framework from Gemfile dependencies', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('Gemfile');
      });
      mockFs.readFileSync.mockReturnValue('gem "rspec-rails", "~> 6.0"');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('rspec');
    });

    it('should default to minitest for Ruby projects', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('Gemfile');
      });
      mockFs.readFileSync.mockReturnValue('gem "rails", "~> 7.0"');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.framework).toBe('minitest');
    });
  });

  describe('File Extension Detection Fallback', () => {
    beforeEach(() => {
      // Mock directory reading for extension detection
      mockFs.readdirSync.mockImplementation((dir: string) => {
        if (dir === mockProjectPath) {
          return [
            { name: 'app.js', isFile: () => true, isDirectory: () => false },
            { name: 'test.ts', isFile: () => true, isDirectory: () => false },
            { name: 'utils.py', isFile: () => true, isDirectory: () => false },
            { name: 'main.rb', isFile: () => true, isDirectory: () => false },
            { name: 'node_modules', isFile: () => false, isDirectory: () => true }
          ] as any[];
        }
        return [];
      });
    });

    it('should detect language by file extensions when no config files found', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = detector.detectProject(mockProjectPath);

      expect(result?.language).toBe('javascript'); // Most common extension wins
    });

    it('should ignore node_modules and hidden directories', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        { name: '.git', isFile: () => false, isDirectory: () => true },
        { name: 'node_modules', isFile: () => false, isDirectory: () => true },
        { name: 'app.js', isFile: () => true, isDirectory: () => false }
      ] as any[]);

      const result = detector.detectProject(mockProjectPath);

      expect(result?.language).toBe('javascript');
    });

    it('should handle file system errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = detector.detectProject(mockProjectPath);

      expect(result).toBeNull();
    });
  });

  describe('Language Priority Detection', () => {
    it('should prioritize specific config files over file extensions', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json') || filePath.includes('requirements.txt');
      });
      mockFs.readFileSync.mockReturnValue('{}');

      const result = detector.detectProject(mockProjectPath);

      // JavaScript should win due to higher confidence (config file vs extension)
      expect(result?.language).toBe('javascript');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project directory', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([]);

      const result = detector.detectProject(mockProjectPath);

      expect(result).toBeNull();
    });

    it('should handle project with no test framework indicators', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json');
      });
      mockFs.readFileSync.mockReturnValue('{"name": "my-project"}');

      const result = detector.detectProject(mockProjectPath);

      expect(result?.language).toBe('javascript');
      expect(result?.framework).toBeNull();
      expect(result?.confidence).toBe(70);
    });

    it('should use current working directory as default', () => {
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue('/default/path');
      
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([]);

      detector.detectProject(); // No path argument

      expect(mockFs.existsSync).toHaveBeenCalledWith('/default/path/package.json');
      
      process.cwd = originalCwd;
    });
  });

  describe('Complex Project Scenarios', () => {
    it('should handle monorepo with multiple languages', () => {
      // Simulate a project with both JS and Python indicators
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json') || filePath.includes('requirements.txt');
      });
      
      const mockPackageJson = { dependencies: { jest: '^29.0.0' } };
      mockFs.readFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return JSON.stringify(mockPackageJson);
        }
        return 'pytest>=7.0.0';
      });

      const result = detector.detectProject(mockProjectPath);

      // Should detect the first matching language (JavaScript has higher priority in detection order)
      expect(result?.language).toBe('javascript');
      expect(result?.framework).toBe('jest');
    });

    it('should handle projects with multiple framework indicators', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('package.json') || 
               filePath.includes('jest.config.js') || 
               filePath.includes('vitest.config.ts');
      });
      
      const mockPackageJson = {
        devDependencies: { jest: '^29.0.0', vitest: '^1.0.0' }
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

      const result = detector.detectProject(mockProjectPath);

      // Should prioritize config files over package.json dependencies
      expect(result?.framework).toBe('vitest'); // vitest config has higher confidence
    });
  });
});