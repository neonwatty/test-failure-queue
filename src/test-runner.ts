import { execSync } from 'child_process';
import { TestFramework, TestRunResult, TestRunnerOptions } from './types';

const FRAMEWORK_PATTERNS: Record<TestFramework, RegExp> = {
  jest: /FAIL\s+(\S+\.(?:test|spec)\.[jt]sx?)/g,
  mocha: /\s+\d+\)\s+(.+\.(?:test|spec)\.[jt]sx?):/gm,
  vitest: /❯\s+(\S+\.(?:test|spec)\.[jt]sx?)/g
};

export class TestRunner {
  private framework: TestFramework;
  private command: string;

  constructor(options: TestRunnerOptions = {}) {
    this.framework = options.framework || 'jest';
    this.command = options.command || 'npm test';
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
      framework: this.framework,
      command: this.command,
      stdout,
      stderr,
      error: error?.message || null
    };
  }

  private extractFailingTests(output: string): string[] {
    const pattern = FRAMEWORK_PATTERNS[this.framework];
    const failingTests: string[] = [];
    let match: RegExpExecArray | null;

    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(output)) !== null) {
      if (match[1]) {
        failingTests.push(match[1]);
      }
    }

    return [...new Set(failingTests)];
  }

  static getFrameworks(): TestFramework[] {
    return ['jest', 'mocha', 'vitest'];
  }

  static isValidFramework(framework: string): framework is TestFramework {
    return TestRunner.getFrameworks().includes(framework as TestFramework);
  }
}