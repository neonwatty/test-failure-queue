import * as fs from 'fs';
import * as path from 'path';
import { BaseAdapter, TestPattern, ParsedTestOutput } from './base';

export class PythonAdapter extends BaseAdapter {
  readonly language = 'python';
  readonly supportedFrameworks = ['pytest', 'unittest', 'django', 'nose2'];
  readonly defaultFramework = 'pytest';
  
  detectFramework(projectPath?: string): string | null {
    const basePath = projectPath || process.cwd();
    const requirementsPath = path.join(basePath, 'requirements.txt');
    const requirementsDevPath = path.join(basePath, 'requirements-dev.txt');
    const setupPyPath = path.join(basePath, 'setup.py');
    const pyprojectPath = path.join(basePath, 'pyproject.toml');
    const managePyPath = path.join(basePath, 'manage.py');
    const pipfilePath = path.join(basePath, 'Pipfile');
    
    let dependencies = '';
    
    if (fs.existsSync(requirementsPath)) {
      dependencies += fs.readFileSync(requirementsPath, 'utf-8');
    }
    if (fs.existsSync(requirementsDevPath)) {
      dependencies += '\n' + fs.readFileSync(requirementsDevPath, 'utf-8');
    }
    if (fs.existsSync(pipfilePath)) {
      dependencies += '\n' + fs.readFileSync(pipfilePath, 'utf-8');
    }
    if (fs.existsSync(pyprojectPath)) {
      dependencies += '\n' + fs.readFileSync(pyprojectPath, 'utf-8');
    }
    if (fs.existsSync(setupPyPath)) {
      dependencies += '\n' + fs.readFileSync(setupPyPath, 'utf-8');
    }
    
    // Prefer Django only if manage.py exists
    if (fs.existsSync(managePyPath)) {
      return 'django';
    }
    
    // Check for pytest before django in dependencies
    if (dependencies.includes('pytest')) {
      return 'pytest';
    }
    
    // Check for django without manage.py
    if (dependencies.includes('django')) {
      return 'django';
    }
    
    if (dependencies.includes('nose2')) {
      return 'nose2';
    }
    
    const testsDir = path.join(basePath, 'tests');
    const testDir = path.join(basePath, 'test');
    if (fs.existsSync(testsDir) || fs.existsSync(testDir)) {
      const testFiles = fs.readdirSync(fs.existsSync(testsDir) ? testsDir : testDir);
      if (testFiles.some(file => file.startsWith('test_') || file.endsWith('_test.py'))) {
        // Check if unittest is explicitly used
        const hasUnittestFiles = testFiles.some(file => {
          if (file.endsWith('.py')) {
            const filePath = path.join(fs.existsSync(testsDir) ? testsDir : testDir, file);
            try {
              const stats = fs.statSync(filePath);
              if (stats.isFile()) {
                const content = fs.readFileSync(filePath, 'utf-8');
                return content.includes('import unittest') || content.includes('from unittest');
              }
            } catch (error) {
              // File doesn't exist or not accessible
              return false;
            }
          }
          return false;
        });
        if (hasUnittestFiles && !dependencies.includes('pytest')) {
          return 'unittest';
        }
        return 'pytest';
      }
    }
    
    // Default to unittest if no specific framework is detected
    return 'unittest';
  }
  
  getTestCommand(framework: string, testPath?: string): string {
    const basePath = testPath || '';
    
    switch (framework.toLowerCase()) {
      case 'pytest':
        if (testPath) {
          return `pytest ${basePath}`;
        }
        return 'pytest';
        
      case 'unittest':
        if (testPath) {
          return `python -m unittest ${basePath}`;
        }
        return 'python -m unittest discover';
        
      case 'django':
        if (testPath) {
          return `python manage.py test ${basePath}`;
        }
        return 'python manage.py test';
        
      case 'nose2':
        if (testPath) {
          return `nose2 ${basePath}`;
        }
        return 'nose2';
        
      default:
        return 'python -m pytest';
    }
  }
  
  getFailurePatterns(framework: string): TestPattern[] {
    switch (framework.toLowerCase()) {
      case 'pytest':
        return [
          {
            pattern: /FAILED\s+([^\s]+::[^\s]+)(?:\[.+?\])?/g,
            type: 'failure',
            extractLocation: (match) => {
              // Store full pytest identifier for later use
              return {
                file: match[1], // Keep full format for now
                line: undefined
              };
            }
          },
          {
            pattern: /ERROR\s+([^\s]+::[^\s]+)(?:\[.+?\])?/g,
            type: 'error',
            extractLocation: (match) => {
              // Store full pytest identifier for later use
              return {
                file: match[1], // Keep full format for now
                line: undefined
              };
            }
          }
        ];
        
      case 'unittest':
        return [
          {
            pattern: /FAIL:\s+(.+?)\s+\((.+?)\)/g,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1] + ' (' + match[2] + ')',
              line: undefined
            })
          },
          {
            pattern: /ERROR:\s+(.+?)\s+\((.+?)\)/g,
            type: 'error',
            extractLocation: (match) => ({
              file: match[1] + ' (' + match[2] + ')',
              line: undefined
            })
          }
        ];
        
      case 'django':
        return [
          {
            pattern: /FAIL:\s+(.+?)\s+\((.+?)\)/g,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1] + ' (' + match[2] + ')',
              line: undefined
            })
          },
          {
            pattern: /ERROR:\s+(.+?)\s+\((.+?)\)/g,
            type: 'error',
            extractLocation: (match) => ({
              file: match[1] + ' (' + match[2] + ')',
              line: undefined
            })
          }
        ];
        
      case 'nose2':
        return [
          {
            pattern: /FAIL:\s+(.+\.\w+)/g,
            type: 'failure',
            extractLocation: (match) => ({
              file: match[1],
              line: undefined
            })
          },
          {
            pattern: /ERROR:\s+(.+\.\w+)/g,
            type: 'error',
            extractLocation: (match) => ({
              file: match[1],
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
    const rawFailures = this.extractFailures(output, patterns);
    const rawErrors = this.extractErrors(output, patterns);
    const summary = this.extractPythonSummary(output, framework);
    
    const passed = rawFailures.length === 0 && rawErrors.length === 0;
    
    // For pytest, separate file path from test identifier
    let failures: ParsedTestOutput['failures'];
    let errors: ParsedTestOutput['errors'];
    let failingTests: string[];
    
    if (framework === 'pytest') {
      // For failures array, extract just the file path
      failures = rawFailures.map(f => ({
        ...f,
        file: f.file.includes('::') ? f.file.split('::')[0] : f.file
      }));
      errors = rawErrors.map(e => ({
        ...e,
        file: e.file.includes('::') ? e.file.split('::')[0] : e.file
      }));
      
      // For failingTests, keep the full pytest format
      failingTests = [...new Set([
        ...rawFailures.map(f => f.file),
        ...rawErrors.map(e => e.file)
      ])];
    } else {
      failures = rawFailures;
      errors = rawErrors;
      failingTests = [...new Set([
        ...failures.map(f => f.line ? `${f.file}:${f.line}` : f.file),
        ...errors.map(e => e.line ? `${e.file}:${e.line}` : e.file)
      ])];
    }
    
    return {
      passed,
      failingTests,
      failures,
      errors,
      summary
    };
  }
  
  private extractPythonSummary(output: string, framework: string): ParsedTestOutput['summary'] {
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
    
    switch (framework.toLowerCase()) {
      case 'pytest':
        const pytestMatch = output.match(/(\d+)\s+passed(?:,\s+(\d+)\s+skipped)?(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+error)?/);
        if (pytestMatch) {
          summary.passed = parseInt(pytestMatch[1], 10);
          summary.skipped = pytestMatch[2] ? parseInt(pytestMatch[2], 10) : 0;
          summary.failed = pytestMatch[3] ? parseInt(pytestMatch[3], 10) : 0;
          if (pytestMatch[4]) {
            summary.failed += parseInt(pytestMatch[4], 10);
          }
          summary.total = summary.passed + summary.failed + summary.skipped;
        }
        
        const pytestShortMatch = output.match(/=+\s+(\d+)\s+failed,\s+(\d+)\s+passed/);
        if (pytestShortMatch) {
          summary.failed = parseInt(pytestShortMatch[1], 10);
          summary.passed = parseInt(pytestShortMatch[2], 10);
          summary.total = summary.passed + summary.failed;
        }
        break;
        
      case 'unittest':
      case 'django':
      case 'nose2':
        const unittestMatch = output.match(/Ran\s+(\d+)\s+tests?/);
        if (unittestMatch) {
          summary.total = parseInt(unittestMatch[1], 10);
        }
        
        const failMatch = output.match(/FAILED\s+\((?:failures=(\d+))?(?:,?\s*)?(?:errors=(\d+))?(?:,?\s*)?(?:skipped=(\d+))?\)/);
        if (failMatch) {
          summary.failed = (failMatch[1] ? parseInt(failMatch[1], 10) : 0) + 
                          (failMatch[2] ? parseInt(failMatch[2], 10) : 0);
          summary.skipped = failMatch[3] ? parseInt(failMatch[3], 10) : 0;
          summary.passed = summary.total - summary.failed - summary.skipped;
        } else if (output.includes('OK')) {
          summary.passed = summary.total;
        }
        break;
    }
    
    return summary;
  }
}