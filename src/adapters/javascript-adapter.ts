import * as fs from 'fs';
import * as path from 'path';
import { BaseAdapter, TestPattern, ParsedTestOutput } from './base';

export class JavaScriptAdapter extends BaseAdapter {
  readonly language = 'javascript';
  readonly supportedFrameworks = ['jest', 'mocha', 'vitest', 'jasmine', 'ava'];
  readonly defaultFramework = 'jest';
  
  detectFramework(projectPath?: string): string | null {
    const basePath = projectPath || process.cwd();
    const packageJsonPath = path.join(basePath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };
      
      const scripts = packageJson.scripts || {};
      const testScript = scripts.test || '';
      
      if (deps.jest || testScript.includes('jest')) {
        return 'jest';
      }
      if (deps.vitest || testScript.includes('vitest')) {
        return 'vitest';
      }
      if (deps.mocha || testScript.includes('mocha')) {
        return 'mocha';
      }
      if (deps.jasmine || testScript.includes('jasmine')) {
        return 'jasmine';
      }
      if (deps.ava || testScript.includes('ava')) {
        return 'ava';
      }
      
      if (testScript) {
        return 'jest';
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  getTestCommand(framework: string, testPath?: string): string {
    const basePath = testPath || '';
    
    switch (framework.toLowerCase()) {
      case 'jest':
        return testPath ? `npx jest ${basePath}` : 'npm test';
      case 'mocha':
        return testPath ? `npx mocha ${basePath}` : 'npm test';
      case 'vitest':
        return testPath ? `npx vitest run ${basePath}` : 'npm test';
      case 'jasmine':
        return testPath ? `npx jasmine ${basePath}` : 'npm test';
      case 'ava':
        return testPath ? `npx ava ${basePath}` : 'npm test';
      default:
        return 'npm test';
    }
  }
  
  getFailurePatterns(framework: string): TestPattern[] {
    switch (framework.toLowerCase()) {
      case 'jest':
        return [
          {
            pattern: /FAIL\s+(\S+\.(?:test|spec)\.[jt]sx?)(?::(\d+))?/,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: match[2] ? parseInt(match[2], 10) : undefined
            })
          },
          {
            pattern: /✕\s+(.+)\s+\((\d+)\s+ms\)/,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: undefined
            })
          }
        ];
        
      case 'mocha':
        return [
          {
            pattern: /\d+\)\s+.+:\s*\n\s+(.+\.(?:test|spec)\.[jt]sx?)(?::(\d+))?/gm,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: match[2] ? parseInt(match[2], 10) : undefined
            })
          },
          {
            pattern: /\s+\d+\)\s+(.+\.(?:test|spec)\.[jt]sx?):/gm,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: undefined
            })
          },
          {
            pattern: /Error:\s+(.+)\n\s+at\s+.+\((.+\.(?:test|spec)\.[jt]sx?):(\d+):\d+\)/,
            type: 'error',
            extractLocation: (match) => ({
              file: match[2],
              line: parseInt(match[3], 10)
            })
          }
        ];
        
      case 'vitest':
        return [
          {
            pattern: /❯\s+(\S+\.(?:test|spec)\.[jt]sx?)(?::(\d+):(\d+))?/,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: match[2] ? parseInt(match[2], 10) : undefined
            })
          },
          {
            pattern: /FAIL\s+(\S+\.(?:test|spec)\.[jt]sx?)/,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: undefined
            })
          }
        ];
        
      case 'jasmine':
        return [
          {
            pattern: /at\s+.+\s+\((.+\.(?:test|spec)\.[jt]sx?):(\d+):\d+\)/,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: parseInt(match[2], 10)
            })
          },
          {
            pattern: /\s+✗\s+(.+)/,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: undefined
            })
          }
        ];
        
      case 'ava':
        return [
          {
            pattern: /(\S+\.(?:test|spec)\.[jt]sx?):\d+/,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: undefined
            })
          },
          {
            pattern: /✖\s+(.+)\s+(.+\.(?:test|spec)\.[jt]sx?)/,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[2],
              line: undefined
            })
          }
        ];
        
      default:
        return [];
    }
  }
  
  parseTestOutput(output: string, framework: string): ParsedTestOutput {
    const patterns = this.getFailurePatterns(framework);
    const failures = this.extractFailures(output, patterns);
    const errors = this.extractErrors(output, patterns);
    const summary = this.extractSummary(output);
    
    const passed = failures.length === 0 && errors.length === 0;
    const failingTests = [...new Set(failures.map(f => f.file))];
    
    return {
      passed,
      failingTests,
      failures,
      errors,
      summary
    };
  }
  
  protected extractSummary(output: string): ParsedTestOutput['summary'] {
    const summary = super.extractSummary(output);
    
    const jestMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (jestMatch) {
      summary.failed = parseInt(jestMatch[1], 10);
      summary.passed = parseInt(jestMatch[2], 10);
      summary.total = parseInt(jestMatch[3], 10);
    }
    
    const mochaMatch = output.match(/(\d+)\s+passing.*\n.*(\d+)\s+failing/);
    if (mochaMatch) {
      summary.passed = parseInt(mochaMatch[1], 10);
      summary.failed = parseInt(mochaMatch[2], 10);
      summary.total = summary.passed + summary.failed;
    }
    
    const vitestMatch = output.match(/Tests\s+(\d+)\s+passed\s+\|\s+(\d+)\s+failed/);
    if (vitestMatch) {
      summary.passed = parseInt(vitestMatch[1], 10);
      summary.failed = parseInt(vitestMatch[2], 10);
      summary.total = summary.passed + summary.failed;
    }
    
    return summary;
  }
}