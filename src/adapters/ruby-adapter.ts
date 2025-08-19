import * as fs from 'fs';
import * as path from 'path';
import { BaseAdapter, TestPattern, ParsedTestOutput } from './base';

export class RubyAdapter extends BaseAdapter {
  readonly language = 'ruby';
  readonly supportedFrameworks = ['minitest', 'rspec', 'test-unit', 'cucumber'];
  readonly defaultFramework = 'rspec';
  
  detectFramework(projectPath?: string): string | null {
    const basePath = projectPath || process.cwd();
    const gemfilePath = path.join(basePath, 'Gemfile');
    const gemfileLockPath = path.join(basePath, 'Gemfile.lock');
    const specDir = path.join(basePath, 'spec');
    const testDir = path.join(basePath, 'test');
    const featuresDir = path.join(basePath, 'features');
    
    let gemfileContent = '';
    if (fs.existsSync(gemfilePath)) {
      gemfileContent = fs.readFileSync(gemfilePath, 'utf-8');
    } else if (fs.existsSync(gemfileLockPath)) {
      gemfileContent = fs.readFileSync(gemfileLockPath, 'utf-8');
    }
    
    if (gemfileContent.includes('rspec') || fs.existsSync(specDir)) {
      return 'rspec';
    }
    
    if (gemfileContent.includes('minitest') || fs.existsSync(testDir)) {
      const isRails = gemfileContent.includes('rails') || 
                     fs.existsSync(path.join(basePath, 'config/application.rb'));
      if (isRails) {
        return 'minitest';
      }
    }
    
    if (gemfileContent.includes('cucumber') || fs.existsSync(featuresDir)) {
      return 'cucumber';
    }
    
    if (gemfileContent.includes('test-unit')) {
      return 'test-unit';
    }
    
    if (fs.existsSync(testDir)) {
      return 'minitest';
    }
    
    return null;
  }
  
  getTestCommand(framework: string, testPath?: string): string {
    const basePath = testPath || '';
    
    switch (framework.toLowerCase()) {
      case 'minitest':
        if (testPath) {
          return `rails test ${basePath}`;
        }
        return 'rails test';
        
      case 'rspec':
        if (testPath) {
          return `bundle exec rspec ${basePath}`;
        }
        return 'bundle exec rspec';
        
      case 'cucumber':
        if (testPath) {
          return `bundle exec cucumber ${basePath}`;
        }
        return 'bundle exec cucumber';
        
      case 'test-unit':
        if (testPath) {
          return `ruby -Ilib:test ${basePath}`;
        }
        return 'ruby -Ilib:test';
        
      default:
        return 'rake test';
    }
  }
  
  getFailurePatterns(framework: string): TestPattern[] {
    switch (framework.toLowerCase()) {
      case 'minitest':
        return [
          {
            pattern: /Failure:\n(.+?)#(.+?)\s+\[(.+?):(\d+)\]/gm,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[3],
              line: parseInt(match[4], 10)
            })
          },
          {
            pattern: /Error:\n(.+?)#(.+?):\n(.+?)\n\s+(.+?):(\d+)/gm,
            type: 'error',
            extractLocation: (match) => ({
              file: match[4],
              line: parseInt(match[5], 10)
            })
          },
          {
            pattern: /rails test (.+?):(\d+)/g,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: parseInt(match[2], 10)
            })
          },
          {
            // Match simple "Failure: path/to/file.rb:123" format
            pattern: /^Failure:\s+([^:\[\s]+\.rb):(\d+)$/gm,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: parseInt(match[2], 10)
            })
          }
        ];
        
      case 'rspec':
        return [
          {
            pattern: /rspec\s+((?:\.\/)?(?:.+?)):(\d+)/,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: parseInt(match[2], 10)
            })
          },
          {
            pattern: /^\s+Failure\/Error:.+?\n.+?\n.+?#\s+(.+?):(\d+)/m,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: parseInt(match[2], 10)
            })
          },
          {
            pattern: /Failed examples:\n\n((?:rspec .+\n?)+)/m,
            type: 'failure',
            extractLocation: (match) => {
              const failedExamples = match[1].split('\n').filter(line => line.trim());
              if (failedExamples.length > 0) {
                const firstExample = failedExamples[0];
                const fileMatch = firstExample.match(/rspec\s+((?:\.\/)?(?:.+?)):(\d+)/);
                if (fileMatch) {
                  return {
                    file: fileMatch[1],
                    line: parseInt(fileMatch[2], 10)
                  };
                }
              }
              return { file: '', line: undefined };
            }
          }
        ];
        
      case 'cucumber':
        return [
          {
            pattern: /(.+?\.feature):(\d+)/g,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: parseInt(match[2], 10)
            })
          },
          {
            pattern: /Failing Scenarios:\n((?:.+?\.feature:\d+.+?\n?)+)/gm,
            type: 'failure',
            extractLocation: (match) => {
              const scenarios = match[1].split('\n').filter(line => line.trim());
              if (scenarios.length > 0) {
                const firstScenario = scenarios[0];
                const fileMatch = firstScenario.match(/(.+?\.feature):(\d+)/);
                if (fileMatch) {
                  return {
                    file: fileMatch[1],
                    line: parseInt(fileMatch[2], 10)
                  };
                }
              }
              return { file: '', line: undefined };
            }
          }
        ];
        
      case 'test-unit':
        return [
          {
            pattern: /Failure:\n(.+?)\((.+?)\)\s+\[(.+?):(\d+)\]/gm,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[3],
              line: parseInt(match[4], 10)
            })
          },
          {
            pattern: /Error:\n(.+?)\((.+?)\):\n(.+?)\n\s+(.+?):(\d+)/gm,
            type: 'error',
            extractLocation: (match) => ({
              file: match[4],
              line: parseInt(match[5], 10)
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
    const summary = this.extractRubySummary(output, framework);
    
    const passed = failures.length === 0 && errors.length === 0;
    const failingTests = [...new Set([
      ...failures.map(f => f.line ? `${f.file}:${f.line}` : f.file),
      ...errors.map(e => e.line ? `${e.file}:${e.line}` : e.file)
    ])];
    
    return {
      passed,
      failingTests,
      failures,
      errors,
      summary
    };
  }
  
  private extractRubySummary(output: string, framework: string): ParsedTestOutput['summary'] {
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
    
    switch (framework.toLowerCase()) {
      case 'minitest':
        const minitestMatch = output.match(/(\d+)\s+runs?,\s+(\d+)\s+assertions?,\s+(\d+)\s+failures?,\s+(\d+)\s+errors?,\s+(\d+)\s+skips?/);
        if (minitestMatch) {
          summary.total = parseInt(minitestMatch[1], 10);
          summary.failed = parseInt(minitestMatch[3], 10) + parseInt(minitestMatch[4], 10);
          summary.skipped = parseInt(minitestMatch[5], 10);
          summary.passed = summary.total - summary.failed - summary.skipped;
        }
        break;
        
      case 'rspec':
        const rspecMatch = output.match(/(\d+)\s+examples?,\s+(\d+)\s+failures?(?:,\s+(\d+)\s+pending)?/);
        if (rspecMatch) {
          summary.total = parseInt(rspecMatch[1], 10);
          summary.failed = parseInt(rspecMatch[2], 10);
          summary.skipped = rspecMatch[3] ? parseInt(rspecMatch[3], 10) : 0;
          summary.passed = summary.total - summary.failed - summary.skipped;
        }
        break;
        
      case 'cucumber':
        const cucumberMatch = output.match(/(\d+)\s+scenarios?\s+\((?:(\d+)\s+failed)?(?:,?\s*)?(?:(\d+)\s+passed)?/);
        if (cucumberMatch) {
          summary.failed = cucumberMatch[2] ? parseInt(cucumberMatch[2], 10) : 0;
          summary.passed = cucumberMatch[3] ? parseInt(cucumberMatch[3], 10) : 0;
          summary.total = parseInt(cucumberMatch[1], 10);
        }
        break;
        
      case 'test-unit':
        const testUnitMatch = output.match(/(\d+)\s+tests?,\s+(\d+)\s+assertions?,\s+(\d+)\s+failures?,\s+(\d+)\s+errors?/);
        if (testUnitMatch) {
          summary.total = parseInt(testUnitMatch[1], 10);
          summary.failed = parseInt(testUnitMatch[3], 10) + parseInt(testUnitMatch[4], 10);
          summary.passed = summary.total - summary.failed;
        }
        break;
    }
    
    return summary;
  }
}