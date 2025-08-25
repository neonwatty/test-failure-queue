import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { InitService } from '../../src/core/init-service.js';
import { TfqConfig } from '../../src/core/types.js';
import { TestAdapterRegistry } from '../../src/adapters/registry.js';
import { ConfigManager } from '../../src/core/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

vi.mock('fs');
vi.mock('../../src/adapters/registry.js');
vi.mock('../../src/core/config.js');

describe('InitService', () => {
  let service: InitService;
  let tempDir: string;
  let mockRegistry: any;
  let mockConfigManager: any;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), 'tfq-test-' + Date.now());
    
    // Mock the registry
    mockRegistry = {
      detectLanguage: vi.fn().mockReturnValue(null),
      detectFramework: vi.fn().mockReturnValue(null)
    };
    vi.mocked(TestAdapterRegistry.getInstance).mockReturnValue(mockRegistry);
    
    // Mock the config manager
    mockConfigManager = {
      writeConfig: vi.fn()
    };
    vi.mocked(ConfigManager).mockImplementation(() => mockConfigManager);
    
    service = new InitService();
    
    // Mock fs methods
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.mocked(fs.readFileSync).mockImplementation(() => '');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should create default configuration', async () => {
      const config = await service.initialize();
      
      expect(config).toBeDefined();
      expect(config.database?.path).toBe('./.tfq/tfq.db');
      expect(config.defaults?.autoAdd).toBe(true);
      expect(config.defaults?.parallel).toBe(4);
    });

    it('should use custom database path when provided', async () => {
      const config = await service.initialize({
        dbPath: './custom/path.db'
      });
      
      expect(config.database?.path).toBe('./custom/path.db');
    });

    it('should use CI configuration when ci flag is set', async () => {
      const config = await service.initialize({
        ci: true
      });
      
      expect(config.database?.path).toBe('/tmp/tfq-tfq.db');
    });

    it('should throw error if .tfqrc already exists and not in CI mode', async () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      
      await expect(service.initialize()).rejects.toThrow('.tfqrc already exists');
    });

    it('should overwrite existing config in CI mode', async () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      
      const config = await service.initialize({ ci: true });
      expect(config).toBeDefined();
    });

    it('should detect workspace mode when enabled', async () => {
      // Mock package.json with workspaces
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        if (pathStr.endsWith('package.json')) return true;
        if (pathStr.endsWith('packages')) return true;
        if (pathStr.includes('packages/app')) return true;
        if (pathStr.includes('packages/lib')) return true;
        return false;
      });
      
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p.toString().endsWith('package.json')) {
          return JSON.stringify({
            workspaces: ['packages/*']
          });
        }
        return '';
      });
      
      vi.mocked(fs.readdirSync).mockImplementation((p: any) => {
        if (p.toString().includes('packages')) {
          return ['app', 'lib'] as any;
        }
        return [];
      });
      
      vi.mocked(fs.statSync).mockReturnValue({
        isDirectory: () => true
      } as any);
      
      const config = await service.initialize({
        workspaceMode: true
      });
      
      expect(config.workspaces).toBeDefined();
      expect(config.workspaceDefaults).toBeDefined();
    });
  });

  describe('detectProjectType', () => {
    it('should detect JavaScript project from package.json', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => 
        p.toString().endsWith('package.json')
      );
      
      mockRegistry.detectLanguage.mockReturnValue('javascript');
      
      const language = service.detectProjectType();
      expect(language).toBe('javascript');
    });

    it('should detect Python project from requirements.txt', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => 
        p.toString().endsWith('requirements.txt')
      );
      
      mockRegistry.detectLanguage.mockReturnValue('python');
      
      const language = service.detectProjectType();
      expect(language).toBe('python');
    });

    it('should detect Ruby project from Gemfile', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => 
        p.toString().endsWith('Gemfile')
      );
      
      mockRegistry.detectLanguage.mockReturnValue('ruby');
      
      const language = service.detectProjectType();
      expect(language).toBe('ruby');
    });

    it('should return null for unknown project type', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      
      mockRegistry.detectLanguage.mockReturnValue(null);
      
      const language = service.detectProjectType();
      expect(language).toBeNull();
    });
  });

  describe('detectFramework', () => {
    it('should detect framework for given language', () => {
      mockRegistry.detectFramework.mockReturnValue('vitest');
      
      const framework = service.detectFramework('javascript');
      expect(framework).toBe('vitest');
    });

    it('should return null if no framework detected', () => {
      mockRegistry.detectFramework.mockReturnValue(null);
      
      const framework = service.detectFramework('javascript');
      expect(framework).toBeNull();
    });
  });

  describe('generateDefaultConfig', () => {
    it('should generate config with detected language and framework', () => {
      const config = service.generateDefaultConfig({
        language: 'javascript',
        framework: 'vitest',
        projectPath: tempDir
      });
      
      expect(config.language).toBe('javascript');
      expect(config.framework).toBe('vitest');
      expect(config.database?.path).toBe('./.tfq/tfq.db');
      expect(config.defaults?.autoAdd).toBe(true);
      expect(config.defaults?.parallel).toBe(4);
    });

    it('should generate CI config when ci flag is set', () => {
      const config = service.generateDefaultConfig({
        language: 'python',
        framework: 'pytest',
        ci: true,
        projectPath: tempDir
      });
      
      expect(config.database?.path).toBe('/tmp/tfq-tfq.db');
    });

    it('should generate shared config when shared flag is set', () => {
      const config = service.generateDefaultConfig({
        language: null,
        framework: null,
        shared: true,
        projectPath: tempDir
      });
      
      expect(config.database?.path).toBe('./.tfq/shared-tfq.db');
    });

    it('should generate workspace config when workspaceMode is enabled', () => {
      // Mock workspace detection
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p.toString().endsWith('package.json')) return true;
        if (p.toString().endsWith('packages')) return true;
        return false;
      });
      
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p.toString().endsWith('package.json')) {
          return JSON.stringify({
            workspaces: ['packages/app', 'packages/lib']
          });
        }
        return '';
      });
      
      const config = service.generateDefaultConfig({
        language: 'javascript',
        framework: 'jest',
        workspaceMode: true,
        projectPath: tempDir
      });
      
      expect(config.workspaces).toBeDefined();
      expect(config.workspaces?.['packages/app']).toBe('./.tfq/app-tfq.db');
      expect(config.workspaces?.['packages/lib']).toBe('./.tfq/lib-tfq.db');
      expect(config.workspaceDefaults).toBeDefined();
    });
  });

  describe('ensureGitignore', () => {
    it('should add .tfq/ to gitignore if not present', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p.toString().endsWith('.git')) return true;
        if (p.toString().endsWith('.gitignore')) return true;
        return false;
      });
      
      vi.mocked(fs.readFileSync).mockReturnValue('# Existing gitignore\nnode_modules/\n');
      
      let writtenContent = '';
      vi.mocked(fs.writeFileSync).mockImplementation((_, content) => {
        writtenContent = content.toString();
      });
      
      await service.ensureGitignore(tempDir);
      
      expect(writtenContent).toContain('.tfq/');
      expect(writtenContent).toContain('# TFQ test failure queue database');
    });

    it('should not modify gitignore if .tfq/ already present', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p.toString().endsWith('.git')) return true;
        if (p.toString().endsWith('.gitignore')) return true;
        return false;
      });
      
      vi.mocked(fs.readFileSync).mockReturnValue('# Existing gitignore\n.tfq/\n');
      
      const writeSpy = vi.mocked(fs.writeFileSync);
      
      await service.ensureGitignore(tempDir);
      
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should skip gitignore modification if not a git repository', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p.toString().endsWith('.git')) return false;
        return false;
      });
      
      const writeSpy = vi.mocked(fs.writeFileSync);
      
      await service.ensureGitignore(tempDir);
      
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should create gitignore if it does not exist', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p.toString().endsWith('.git')) return true;
        if (p.toString().endsWith('.gitignore')) return false;
        return false;
      });
      
      let writtenContent = '';
      vi.mocked(fs.writeFileSync).mockImplementation((_, content) => {
        writtenContent = content.toString();
      });
      
      await service.ensureGitignore(tempDir);
      
      expect(writtenContent).toContain('.tfq/');
      expect(writtenContent).toContain('# TFQ test failure queue database');
    });
  });

  describe('saveConfig', () => {
    it('should save configuration to file', async () => {
      const config: TfqConfig = {
        database: { path: './.tfq/tfq.db' },
        language: 'javascript',
        framework: 'vitest',
        defaults: { autoAdd: true, parallel: 4 }
      };
      
      await service.saveConfig(config);
      
      expect(mockConfigManager.writeConfig).toHaveBeenCalledWith(config, undefined);
    });

    it('should save configuration to custom path', async () => {
      const config: TfqConfig = {
        database: { path: './.tfq/tfq.db' }
      };
      
      const customPath = '/custom/path/.tfqrc';
      
      await service.saveConfig(config, customPath);
      
      expect(mockConfigManager.writeConfig).toHaveBeenCalledWith(config, customPath);
    });
  });
});