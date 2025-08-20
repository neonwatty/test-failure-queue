import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
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
    
    // Check for unsupported frameworks first
    const unsupportedFrameworks = TestRunner.detectUnsupportedFrameworks();
    if (unsupportedFrameworks.length > 0 && !options.skipUnsupportedCheck) {
      console.error('\n⚠️  Unsupported test frameworks detected:\n');
      unsupportedFrameworks.forEach(({ framework, language, suggestion }) => {
        console.error(`  ❌ ${framework} (${language})`);
        console.error(`     ${suggestion}\n`);
      });
      console.error('To bypass this check, use the --skip-unsupported-check flag (not recommended).\n');
      process.exit(1);
    }
    
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

  static detectUnsupportedFrameworks(projectPath?: string): { framework: string; language: string; suggestion: string }[] {
    const basePath = projectPath || process.cwd();
    const unsupported: { framework: string; language: string; suggestion: string }[] = [];

    // Check for Python unsupported frameworks
    const requirementsPath = path.join(basePath, 'requirements.txt');
    const requirementsDevPath = path.join(basePath, 'requirements-dev.txt');
    const managePyPath = path.join(basePath, 'manage.py');
    const pipfilePath = path.join(basePath, 'Pipfile');
    const pyprojectPath = path.join(basePath, 'pyproject.toml');
    
    let pythonDeps = '';
    if (fs.existsSync(requirementsPath)) {
      pythonDeps += fs.readFileSync(requirementsPath, 'utf-8');
    }
    if (fs.existsSync(requirementsDevPath)) {
      pythonDeps += '\n' + fs.readFileSync(requirementsDevPath, 'utf-8');
    }
    if (fs.existsSync(pipfilePath)) {
      pythonDeps += '\n' + fs.readFileSync(pipfilePath, 'utf-8');
    }
    if (fs.existsSync(pyprojectPath)) {
      pythonDeps += '\n' + fs.readFileSync(pyprojectPath, 'utf-8');
    }

    // Check for Django
    if (fs.existsSync(managePyPath) || pythonDeps.toLowerCase().includes('django')) {
      unsupported.push({
        framework: 'Django',
        language: 'Python',
        suggestion: 'Consider using pytest with pytest-django plugin for Django testing. Install with: pip install pytest pytest-django'
      });
    }

    // Check for nose2
    if (pythonDeps.toLowerCase().includes('nose2')) {
      unsupported.push({
        framework: 'nose2',
        language: 'Python',
        suggestion: 'nose2 is no longer supported. Please migrate to pytest: pip install pytest'
      });
    }

    // Check for Ruby unsupported frameworks
    const gemfilePath = path.join(basePath, 'Gemfile');
    const gemfileLockPath = path.join(basePath, 'Gemfile.lock');
    const specDir = path.join(basePath, 'spec');
    const featuresDir = path.join(basePath, 'features');
    
    let rubyDeps = '';
    if (fs.existsSync(gemfilePath)) {
      rubyDeps = fs.readFileSync(gemfilePath, 'utf-8');
    } else if (fs.existsSync(gemfileLockPath)) {
      rubyDeps = fs.readFileSync(gemfileLockPath, 'utf-8');
    }

    // Check for RSpec
    if (rubyDeps.toLowerCase().includes('rspec') || fs.existsSync(specDir)) {
      unsupported.push({
        framework: 'RSpec',
        language: 'Ruby',
        suggestion: 'RSpec is no longer supported. Please use Minitest, which is included with Ruby and Rails by default.'
      });
    }

    // Check for Cucumber
    if (rubyDeps.toLowerCase().includes('cucumber') || fs.existsSync(featuresDir)) {
      unsupported.push({
        framework: 'Cucumber',
        language: 'Ruby',
        suggestion: 'Cucumber is no longer supported. Consider using Minitest for your testing needs.'
      });
    }

    // Check for Test::Unit
    if (rubyDeps.toLowerCase().includes('test-unit') || rubyDeps.toLowerCase().includes('test::unit')) {
      unsupported.push({
        framework: 'Test::Unit',
        language: 'Ruby',
        suggestion: 'Test::Unit is no longer supported. Please migrate to Minitest, which has similar syntax and is included with Ruby.'
      });
    }

    return unsupported;
  }
}