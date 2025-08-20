import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigFile, TestLanguage, TestFramework } from './types.js';
import { TestAdapterRegistry } from '../adapters/registry.js';

export class ConfigManager {
  private config: ConfigFile = {};
  private configPath: string | null = null;

  constructor(customConfigPath?: string) {
    this.loadConfig(customConfigPath);
  }

  private loadConfig(customConfigPath?: string): void {
    const configPaths = this.getConfigPaths(customConfigPath);
    
    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf-8');
          const parsed = JSON.parse(content);
          this.config = this.mergeConfig(this.config, parsed);
          this.configPath = configPath;
          break;
        } catch (error) {
          console.warn(`Warning: Failed to parse config file at ${configPath}:`, error);
        }
      }
    }
  }

  private getConfigPaths(customPath?: string): string[] {
    const paths: string[] = [];
    
    if (customPath) {
      paths.push(path.resolve(customPath));
    }
    
    paths.push(
      path.join(process.cwd(), '.tfqrc'),
      path.join(os.homedir(), '.tfqrc'),
      path.join(os.homedir(), '.tfq', 'config.json')
    );
    
    return paths;
  }

  private mergeConfig(base: ConfigFile, override: ConfigFile): ConfigFile {
    const merged = { ...base, ...override };
    this.validateConfig(merged);
    return merged;
  }

  private validateConfig(config: ConfigFile): void {
    const registry = TestAdapterRegistry.getInstance();
    
    // Validate defaultLanguage
    if (config.defaultLanguage) {
      const supportedLanguages = registry.list().map((info: any) => info.language);
      if (!supportedLanguages.includes(config.defaultLanguage)) {
        console.warn(`Warning: Unsupported language '${config.defaultLanguage}' in config. Supported languages: ${supportedLanguages.join(', ')}`);
        delete config.defaultLanguage;
      }
    }
    
    // Validate defaultFrameworks
    if (config.defaultFrameworks) {
      for (const [language, framework] of Object.entries(config.defaultFrameworks)) {
        const adapter = registry.get(language as TestLanguage);
        if (!adapter) {
          console.warn(`Warning: Unsupported language '${language}' in defaultFrameworks`);
          delete config.defaultFrameworks[language as TestLanguage];
        } else {
          const supportedFrameworks = adapter.supportedFrameworks;
          if (!supportedFrameworks.includes(framework)) {
            console.warn(`Warning: Unsupported framework '${framework}' for language '${language}'. Supported frameworks: ${supportedFrameworks.join(', ')}`);
            delete config.defaultFrameworks[language as TestLanguage];
          }
        }
      }
    }
    
    // Validate testCommands (just ensure it's an object with string values)
    if (config.testCommands && typeof config.testCommands !== 'object') {
      console.warn('Warning: testCommands must be an object');
      delete config.testCommands;
    }
    
    // Validate fixTestsSystemPrompt (ensure it's a string if provided)
    if (config.fixTestsSystemPrompt !== undefined && typeof config.fixTestsSystemPrompt !== 'string') {
      console.warn('Warning: fixTestsSystemPrompt must be a string');
      delete config.fixTestsSystemPrompt;
    }
  }

  private expandPath(filePath: string): string {
    if (filePath.startsWith('~/')) {
      return path.join(os.homedir(), filePath.slice(2));
    }
    return filePath;
  }

  getConfig(): ConfigFile {
    const config = { ...this.config };
    
    if (config.databasePath) {
      config.databasePath = this.expandPath(config.databasePath);
    }
    
    return config;
  }

  getConfigPath(): string | null {
    return this.configPath;
  }

  getDefaultLanguage(): TestLanguage | undefined {
    return this.config.defaultLanguage;
  }

  getDefaultFramework(language: TestLanguage): TestFramework | undefined {
    return this.config.defaultFrameworks?.[language];
  }

  getTestCommand(language: TestLanguage, framework: TestFramework): string | undefined {
    const key = `${language}:${framework}`;
    return this.config.testCommands?.[key];
  }

  createDefaultConfig(targetPath?: string): void {
    const defaultConfig: ConfigFile = {
      databasePath: '~/.tfq/queue.db',
      defaultPriority: 0,
      autoCleanup: false,
      maxRetries: 3,
      verbose: false,
      jsonOutput: false,
      colorOutput: true,
      defaultLanguage: 'javascript',
      defaultFrameworks: {
        javascript: 'jest',
        ruby: 'minitest',
        python: 'pytest',
        go: 'go',
        java: 'junit'
      },
      testCommands: {
        'javascript:jest': 'npm test',
        'javascript:mocha': 'npx mocha',
        'javascript:vitest': 'npx vitest run',
        'ruby:minitest': 'rails test',
        'python:pytest': 'pytest',
        'python:unittest': 'python -m unittest'
      },
      fixTestsSystemPrompt: 'You are a test fixing assistant. Your task is to analyze failing tests and fix the code to make them pass.\n\nRules:\n1. Only modify the minimum necessary code to fix the test\n2. Preserve the existing code style and conventions\n3. Do not change test expectations unless they are clearly wrong\n4. Focus on fixing the implementation, not the test\n5. Ensure your fix is clean, readable, and maintainable\n6. Add necessary imports if missing\n7. Fix any syntax errors or type errors\n\nReturn your fixes as code changes with clear explanations.'
    };

    const configPath = targetPath || path.join(process.cwd(), '.tfqrc');
    
    fs.writeFileSync(
      configPath, 
      JSON.stringify(defaultConfig, null, 2),
      'utf-8'
    );
  }

  static getInstance(customConfigPath?: string): ConfigManager {
    return new ConfigManager(customConfigPath);
  }
}

export function loadConfig(customConfigPath?: string): ConfigFile {
  const manager = new ConfigManager(customConfigPath);
  return manager.getConfig();
}