import { TestAdapterRegistry } from '../../src/adapters/registry';
import { JavaScriptAdapter } from '../../src/adapters/javascript-adapter';
import { RubyAdapter } from '../../src/adapters/ruby-adapter';
import { PythonAdapter } from '../../src/adapters/python-adapter';
import { BaseAdapter } from '../../src/adapters/base';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('TestAdapterRegistry', () => {
  let registry: TestAdapterRegistry;

  beforeEach(() => {
    registry = TestAdapterRegistry.getInstance();
    registry.clear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = TestAdapterRegistry.getInstance();
      const instance2 = TestAdapterRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('register', () => {
    it('should register a valid adapter', () => {
      class CustomAdapter extends BaseAdapter {
        language = 'custom' as any;
        supportedFrameworks = ['test'];
        defaultFramework = 'test';
        
        getTestCommand(): string {
          return 'test';
        }
        
        getFailurePatterns() {
          return [];
        }
        
        detectFramework(): string | null {
          return 'test';
        }
        
        parseTestOutput() {
          return {
            passed: true,
            failingTests: [],
            failures: [],
            errors: [],
            summary: { total: 0, passed: 0, failed: 0, skipped: 0 }
          };
        }
      }

      const adapter = new CustomAdapter();
      expect(() => registry.register('custom' as any, adapter)).not.toThrow();
      expect(registry.get('custom' as any)).toBe(adapter);
    });

    it('should throw error for invalid adapter', () => {
      const invalidAdapter = {} as any;
      expect(() => registry.register('invalid' as any, invalidAdapter))
        .toThrow('Invalid adapter for language: invalid');
    });

    it('should override existing adapter', () => {
      const adapter1 = new JavaScriptAdapter();
      const adapter2 = new JavaScriptAdapter();
      
      registry.register('javascript', adapter1);
      expect(registry.get('javascript')).toBe(adapter1);
      
      registry.register('javascript', adapter2);
      expect(registry.get('javascript')).toBe(adapter2);
    });
  });

  describe('get', () => {
    it('should return registered adapter', () => {
      const adapter = registry.get('javascript');
      expect(adapter).toBeInstanceOf(JavaScriptAdapter);
    });

    it('should throw error for unregistered language', () => {
      expect(() => registry.get('unknown' as any))
        .toThrow('No adapter registered for language: unknown');
    });
  });

  describe('list', () => {
    it('should return all registered adapters info', () => {
      const list = registry.list();
      
      expect(list).toHaveLength(3);
      
      const jsInfo = list.find(info => info.language === 'javascript');
      expect(jsInfo).toBeDefined();
      expect(jsInfo?.supportedFrameworks).toContain('jest');
      expect(jsInfo?.supportedFrameworks).toContain('mocha');
      expect(jsInfo?.supportedFrameworks).toContain('vitest');
      
      const rubyInfo = list.find(info => info.language === 'ruby');
      expect(rubyInfo).toBeDefined();
      expect(rubyInfo?.supportedFrameworks).toContain('rspec');
      expect(rubyInfo?.supportedFrameworks).toContain('minitest');
      
      const pythonInfo = list.find(info => info.language === 'python');
      expect(pythonInfo).toBeDefined();
      expect(pythonInfo?.supportedFrameworks).toContain('pytest');
      expect(pythonInfo?.supportedFrameworks).toContain('unittest');
    });
  });

  describe('detectLanguage', () => {
    const mockExists = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
    const mockReaddir = fs.readdirSync as jest.MockedFunction<typeof fs.readdirSync>;

    it('should detect JavaScript from package.json', () => {
      mockExists.mockImplementation((filePath) => {
        return filePath.toString().endsWith('package.json');
      });

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('javascript');
    });

    it('should detect Ruby from Gemfile', () => {
      mockExists.mockImplementation((filePath) => {
        return filePath.toString().endsWith('Gemfile');
      });

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('ruby');
    });

    it('should detect Python from requirements.txt', () => {
      mockExists.mockImplementation((filePath) => {
        return filePath.toString().endsWith('requirements.txt');
      });

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('python');
    });

    it('should detect Python from setup.py', () => {
      mockExists.mockImplementation((filePath) => {
        return filePath.toString().endsWith('setup.py');
      });

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('python');
    });

    it('should detect Python from pyproject.toml', () => {
      mockExists.mockImplementation((filePath) => {
        return filePath.toString().endsWith('pyproject.toml');
      });

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('python');
    });

    it('should detect Go from go.mod', () => {
      mockExists.mockImplementation((filePath) => {
        return filePath.toString().endsWith('go.mod');
      });

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('go');
    });

    it('should detect Java from pom.xml', () => {
      mockExists.mockImplementation((filePath) => {
        return filePath.toString().endsWith('pom.xml');
      });

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('java');
    });

    it('should detect Java from build.gradle', () => {
      mockExists.mockImplementation((filePath) => {
        return filePath.toString().endsWith('build.gradle');
      });

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('java');
    });

    it('should detect from file extensions when no config files found', () => {
      mockExists.mockReturnValue(false);
      mockReaddir.mockReturnValue([
        'index.js',
        'test.js',
        'config.json',
        'README.md'
      ] as any);

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('javascript');
    });

    it('should detect Ruby from .rb files', () => {
      mockExists.mockReturnValue(false);
      mockReaddir.mockReturnValue([
        'app.rb',
        'test.rb',
        'spec.rb',
        'README.md'
      ] as any);

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('ruby');
    });

    it('should detect Python from .py files', () => {
      mockExists.mockReturnValue(false);
      mockReaddir.mockReturnValue([
        'main.py',
        'test.py',
        'utils.py',
        'README.md'
      ] as any);

      const language = registry.detectLanguage('/test/project');
      expect(language).toBe('python');
    });

    it('should return null when no language detected', () => {
      mockExists.mockReturnValue(false);
      mockReaddir.mockReturnValue([
        'README.md',
        'LICENSE',
        '.gitignore'
      ] as any);

      const language = registry.detectLanguage('/test/project');
      expect(language).toBeNull();
    });

    it('should handle file system errors gracefully', () => {
      mockExists.mockReturnValue(false);
      mockReaddir.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const language = registry.detectLanguage('/test/project');
      expect(language).toBeNull();
    });
  });

  describe('getFrameworksForLanguage', () => {
    it('should return frameworks for JavaScript', () => {
      const frameworks = registry.getFrameworksForLanguage('javascript');
      expect(frameworks).toContain('jest');
      expect(frameworks).toContain('mocha');
      expect(frameworks).toContain('vitest');
      expect(frameworks).toContain('jasmine');
      expect(frameworks).toContain('ava');
    });

    it('should return frameworks for Ruby', () => {
      const frameworks = registry.getFrameworksForLanguage('ruby');
      expect(frameworks).toContain('rspec');
      expect(frameworks).toContain('minitest');
      expect(frameworks).toContain('test-unit');
      expect(frameworks).toContain('cucumber');
    });

    it('should return frameworks for Python', () => {
      const frameworks = registry.getFrameworksForLanguage('python');
      expect(frameworks).toContain('pytest');
      expect(frameworks).toContain('unittest');
      expect(frameworks).toContain('nose2');
      expect(frameworks).toContain('django');
    });

    it('should return empty array for unregistered language', () => {
      const frameworks = registry.getFrameworksForLanguage('unknown' as any);
      expect(frameworks).toEqual([]);
    });
  });

  describe('hasAdapter', () => {
    it('should return true for registered languages', () => {
      expect(registry.hasAdapter('javascript')).toBe(true);
      expect(registry.hasAdapter('ruby')).toBe(true);
      expect(registry.hasAdapter('python')).toBe(true);
    });

    it('should return false for unregistered languages', () => {
      expect(registry.hasAdapter('go')).toBe(false);
      expect(registry.hasAdapter('java')).toBe(false);
      expect(registry.hasAdapter('unknown' as any)).toBe(false);
    });
  });

  describe('detectFramework', () => {
    it('should detect framework for language', () => {
      const mockDetect = jest.spyOn(JavaScriptAdapter.prototype, 'detectFramework')
        .mockReturnValue('jest' as any);

      const framework = registry.detectFramework('javascript', '/test/project');
      expect(framework).toBe('jest');
      expect(mockDetect).toHaveBeenCalledWith('/test/project');
    });

    it('should return null for unregistered language', () => {
      const framework = registry.detectFramework('unknown' as any);
      expect(framework).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear and re-register built-in adapters', () => {
      class CustomAdapter extends BaseAdapter {
        language = 'custom' as any;
        supportedFrameworks = ['test'];
        defaultFramework = 'test';
        
        getTestCommand(): string {
          return 'test';
        }
        
        getFailurePatterns() {
          return [];
        }
        
        detectFramework(): string | null {
          return 'test';
        }
        
        parseTestOutput() {
          return {
            passed: true,
            failingTests: [],
            failures: [],
            errors: [],
            summary: { total: 0, passed: 0, failed: 0, skipped: 0 }
          };
        }
      }

      registry.register('custom' as any, new CustomAdapter());
      expect(registry.hasAdapter('custom' as any)).toBe(true);

      registry.clear();
      
      expect(registry.hasAdapter('custom' as any)).toBe(false);
      expect(registry.hasAdapter('javascript')).toBe(true);
      expect(registry.hasAdapter('ruby')).toBe(true);
      expect(registry.hasAdapter('python')).toBe(true);
    });
  });
});