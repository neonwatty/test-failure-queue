import { TestLanguage, AdapterInfo, AdapterRegistry } from '../core/types.js';
import { LanguageAdapter } from './base.js';
import { JavaScriptAdapter } from './javascript-adapter.js';
import { RubyAdapter } from './ruby-adapter.js';
import { PythonAdapter } from './python-adapter.js';
import fs from 'fs';
import path from 'path';

export class TestAdapterRegistry implements AdapterRegistry {
  private adapters: Map<TestLanguage, LanguageAdapter> = new Map();
  private static instance: TestAdapterRegistry;

  private constructor() {
    this.registerBuiltInAdapters();
  }

  static getInstance(): TestAdapterRegistry {
    if (!TestAdapterRegistry.instance) {
      TestAdapterRegistry.instance = new TestAdapterRegistry();
    }
    return TestAdapterRegistry.instance;
  }

  private registerBuiltInAdapters(): void {
    this.register('javascript', new JavaScriptAdapter());
    this.register('ruby', new RubyAdapter());
    this.register('python', new PythonAdapter());
  }

  register(language: TestLanguage, adapter: LanguageAdapter): void {
    if (!adapter || typeof adapter.getTestCommand !== 'function') {
      throw new Error(`Invalid adapter for language: ${language}`);
    }
    this.adapters.set(language, adapter);
  }

  get(language: TestLanguage): LanguageAdapter {
    const adapter = this.adapters.get(language);
    if (!adapter) {
      throw new Error(`No adapter registered for language: ${language}`);
    }
    return adapter;
  }

  list(): AdapterInfo[] {
    const adapterInfos: AdapterInfo[] = [];
    for (const [language, adapter] of this.adapters.entries()) {
      adapterInfos.push({
        language,
        supportedFrameworks: adapter.supportedFrameworks,
        defaultFramework: adapter.defaultFramework
      });
    }
    return adapterInfos;
  }

  detectLanguage(projectPath: string = process.cwd()): TestLanguage | null {
    const detectionStrategies: Array<() => TestLanguage | null> = [
      () => this.detectFromPackageJson(projectPath),
      () => this.detectFromGemfile(projectPath),
      () => this.detectFromPythonFiles(projectPath),
      () => this.detectFromGoMod(projectPath),
      () => this.detectFromPomXml(projectPath),
      () => this.detectFromFileExtensions(projectPath)
    ];

    for (const strategy of detectionStrategies) {
      const language = strategy();
      if (language) {
        return language;
      }
    }

    return null;
  }

  private detectFromPackageJson(projectPath: string): TestLanguage | null {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return 'javascript';
    }
    return null;
  }

  private detectFromGemfile(projectPath: string): TestLanguage | null {
    const gemfilePath = path.join(projectPath, 'Gemfile');
    if (fs.existsSync(gemfilePath)) {
      return 'ruby';
    }
    return null;
  }

  private detectFromPythonFiles(projectPath: string): TestLanguage | null {
    const pythonIndicators = [
      'requirements.txt',
      'setup.py',
      'setup.cfg',
      'pyproject.toml',
      'Pipfile',
      'poetry.lock'
    ];

    for (const indicator of pythonIndicators) {
      if (fs.existsSync(path.join(projectPath, indicator))) {
        return 'python';
      }
    }
    return null;
  }

  private detectFromGoMod(projectPath: string): TestLanguage | null {
    const goModPath = path.join(projectPath, 'go.mod');
    if (fs.existsSync(goModPath)) {
      return 'go';
    }
    return null;
  }

  private detectFromPomXml(projectPath: string): TestLanguage | null {
    const pomPath = path.join(projectPath, 'pom.xml');
    const buildGradlePath = path.join(projectPath, 'build.gradle');
    if (fs.existsSync(pomPath) || fs.existsSync(buildGradlePath)) {
      return 'java';
    }
    return null;
  }

  private detectFromFileExtensions(projectPath: string): TestLanguage | null {
    const extensionMap: Record<string, TestLanguage> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'javascript',
      '.tsx': 'javascript',
      '.rb': 'ruby',
      '.py': 'python',
      '.go': 'go',
      '.java': 'java'
    };

    try {
      const files = fs.readdirSync(projectPath);
      const extensionCounts: Record<TestLanguage, number> = {
        javascript: 0,
        ruby: 0,
        python: 0,
        go: 0,
        java: 0
      };

      for (const file of files) {
        const ext = path.extname(file);
        const language = extensionMap[ext];
        if (language) {
          extensionCounts[language]++;
        }
      }

      let maxCount = 0;
      let detectedLanguage: TestLanguage | null = null;
      for (const [language, count] of Object.entries(extensionCounts)) {
        if (count > maxCount) {
          maxCount = count;
          detectedLanguage = language as TestLanguage;
        }
      }

      return detectedLanguage;
    } catch (error) {
      return null;
    }
  }

  getFrameworksForLanguage(language: TestLanguage): string[] {
    const adapter = this.adapters.get(language);
    if (!adapter) {
      return [];
    }
    return adapter.supportedFrameworks;
  }

  hasAdapter(language: TestLanguage): boolean {
    return this.adapters.has(language);
  }

  detectFramework(language: TestLanguage, projectPath?: string): string | null {
    const adapter = this.adapters.get(language);
    if (!adapter) {
      return null;
    }
    return adapter.detectFramework(projectPath);
  }

  clear(): void {
    this.adapters.clear();
    this.registerBuiltInAdapters();
  }
}

export const adapterRegistry = TestAdapterRegistry.getInstance();