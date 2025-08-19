import { execSync } from 'child_process';
import { TestLanguage, TestFramework, TestRunResult, TestRunnerOptions } from './types';
import { adapterRegistry } from './adapters/registry';
import { LanguageAdapter } from './adapters/base';
import { ConfigManager } from './config';

export class TestRunner {
  private language: TestLanguage;
  private framework: TestFramework;
  private command: string;
  private adapter: LanguageAdapter;

  constructor(options: TestRunnerOptions = {}) {
    const config = ConfigManager.getInstance();
    
    if (options.autoDetect) {
      const detectedLanguage = adapterRegistry.detectLanguage();
      if (!detectedLanguage) {
        throw new Error('Could not auto-detect project language. Please specify --language explicitly.');
      }
      this.language = detectedLanguage;
      this.adapter = adapterRegistry.get(this.language);
      
      const detectedFramework = this.adapter.detectFramework();
      if (!detectedFramework) {
        this.framework = config.getDefaultFramework(this.language) || this.adapter.defaultFramework;
      } else {
        this.framework = detectedFramework;
      }
    } else {
      // Use config defaults if not specified in options
      this.language = options.language || config.getDefaultLanguage() || 'javascript';
      this.adapter = adapterRegistry.get(this.language);
      this.framework = options.framework || config.getDefaultFramework(this.language) || this.adapter.defaultFramework;
    }

    if (!this.adapter.supportedFrameworks.includes(this.framework)) {
      throw new Error(
        `Framework "${this.framework}" is not supported for language "${this.language}". ` +
        `Supported frameworks: ${this.adapter.supportedFrameworks.join(', ')}`
      );
    }

    // Check for custom test command in config
    const configCommand = config.getTestCommand(this.language, this.framework);
    this.command = options.command || configCommand || this.adapter.getTestCommand(this.framework);
  }

  run(): TestRunResult {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    let error: Error | null = null;

    try {
      const output = execSync(this.command, { 
        encoding: 'utf8', 
        stdio: 'pipe' 
      });
      stdout = output;
    } catch (err: any) {
      exitCode = err.status || 1;
      stdout = err.stdout || '';
      stderr = err.stderr || '';
      error = err;
    }

    const duration = Date.now() - startTime;
    const fullOutput = stdout + stderr;
    const failingTests = this.extractFailingTests(fullOutput);

    return {
      success: exitCode === 0,
      exitCode,
      failingTests,
      totalFailures: failingTests.length,
      duration,
      language: this.language,
      framework: this.framework,
      command: this.command,
      stdout,
      stderr,
      error: error?.message || null
    };
  }

  private extractFailingTests(output: string): string[] {
    try {
      if (!this.adapter.parseTestOutput || typeof this.adapter.parseTestOutput !== 'function') {
        console.warn(`Adapter for ${this.language} is missing parseTestOutput method`);
        return [];
      }
      const parsedOutput = this.adapter.parseTestOutput(output, this.framework);
      return parsedOutput.failingTests;
    } catch (error) {
      console.warn(`Error parsing test output for ${this.language}/${this.framework}:`, error);
      return [];
    }
  }

  static getLanguages(): TestLanguage[] {
    return adapterRegistry.list().map(info => info.language);
  }

  static getFrameworks(language?: TestLanguage): string[] {
    if (!language) {
      const allFrameworks: string[] = [];
      for (const info of adapterRegistry.list()) {
        allFrameworks.push(...info.supportedFrameworks);
      }
      return [...new Set(allFrameworks)];
    }
    return adapterRegistry.getFrameworksForLanguage(language);
  }

  static isValidLanguage(language: string): language is TestLanguage {
    return TestRunner.getLanguages().includes(language as TestLanguage);
  }

  static isValidFramework(framework: string, language?: TestLanguage): boolean {
    if (!language) {
      return TestRunner.getFrameworks().includes(framework);
    }
    return TestRunner.getFrameworks(language).includes(framework);
  }

  static detectLanguage(projectPath?: string): TestLanguage | null {
    return adapterRegistry.detectLanguage(projectPath);
  }

  static detectFramework(language: TestLanguage, projectPath?: string): string | null {
    const adapter = adapterRegistry.get(language);
    return adapter.detectFramework(projectPath);
  }
}