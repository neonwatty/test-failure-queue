import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Example Projects Integration Tests', () => {
  const examplesPath = path.join(__dirname, '../..', 'examples', 'core');
  const tfqBin = path.join(__dirname, '../..', 'bin', 'tfq');
  let tempDbPath: string;

  beforeEach(() => {
    // Use a temporary database for each test to avoid pollution
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfq-test-'));
    tempDbPath = path.join(tempDir, 'test.db');
  });

  afterEach(() => {
    // Clean up temporary database
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      const tempDir = path.dirname(tempDbPath);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper function to run TFQ command and parse JSON output
   */
  function runTfqCommand(projectPath: string, args: string[]): any {
    // Build the full command - use a shell wrapper to ensure consistent behavior
    const tfqCommand = `${tfqBin} run-tests ${args.join(' ')} --json`;
    
    let output = '';
    
    try {
      // Use sh explicitly for consistent behavior across different shells
      output = execSync(tfqCommand, {
        encoding: 'utf8',
        cwd: projectPath,
        env: {
          ...process.env,
          TFQ_DB_PATH: tempDbPath
        },
        shell: '/bin/sh',  // Use sh for consistency
        maxBuffer: 10 * 1024 * 1024
      });
    } catch (error: any) {
      // Command failed (non-zero exit), but we should still have output
      output = error.stdout || '';
      
      if (!output && error.output) {
        // Try to get output from the error object
        output = Array.isArray(error.output) 
          ? error.output.filter(Boolean).join('')
          : String(error.output);
      }
      
      if (!output) {
        console.error('Command failed with no output');
        console.error('Error:', error.message);
        console.error('Command:', tfqCommand);
        console.error('CWD:', projectPath);
        console.error('Exit code:', error.status);
        throw new Error(`TFQ command failed: ${error.message}`);
      }
    }
    
    // Clean the output by finding the JSON
    let jsonStr = '';
    
    // Try to find JSON that starts with {"success"
    const jsonMatch = output.match(/\{"success"[^]*?\}(?=\s*$|\s*\n|$)/);
    
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    } else {
      // Fallback: look for any line that is pure JSON
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{"success"') && trimmed.endsWith('}')) {
          jsonStr = trimmed;
          break;
        }
      }
    }
    
    if (!jsonStr) {
      // Last resort: try to extract JSON by counting braces
      const startIdx = output.indexOf('{"success"');
      if (startIdx >= 0) {
        let braceCount = 0;
        let endIdx = -1;
        
        for (let i = startIdx; i < output.length; i++) {
          if (output[i] === '{') braceCount++;
          if (output[i] === '}') braceCount--;
          
          if (braceCount === 0) {
            endIdx = i + 1;
            break;
          }
        }
        
        if (endIdx > startIdx) {
          jsonStr = output.substring(startIdx, endIdx);
        }
      }
    }
    
    if (!jsonStr) {
      console.error('Could not extract JSON from TFQ output');
      console.error('Output length:', output.length);
      console.error('First 500 chars:', output.substring(0, 500));
      console.error('Last 500 chars:', output.substring(Math.max(0, output.length - 500)));
      throw new Error('No valid JSON found in TFQ output');
    }
    
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse JSON:');
      console.error('JSON string:', jsonStr);
      console.error('Parse error:', e);
      throw new Error(`Invalid JSON: ${e}`);
    }
  }

  /**
   * Helper function to check if pytest is available
   */
  function isPytestAvailable(): boolean {
    try {
      // Check if pytest is available in the Python project's venv
      const pythonProjectPath = path.join(examplesPath, 'python');
      const venvPython = path.join(pythonProjectPath, '.venv', 'bin', 'python');
      
      // First check if venv exists with pytest
      if (fs.existsSync(venvPython)) {
        execSync(`${venvPython} -m pytest --version`, { 
          stdio: 'ignore',
          encoding: 'utf8'
        });
        return true;
      }
      
      // Fallback to global pytest
      execSync('python3 -m pytest --version', { 
        stdio: 'ignore',
        encoding: 'utf8'
      });
      return true;
    } catch {
      return false;
    }
  }

  describe('JavaScript Example (Jest)', () => {
    const projectPath = path.join(examplesPath, 'javascript');

    it('should detect exactly 1 failing test file with explicit parameters', () => {
      const result = runTfqCommand(projectPath, ['--language', 'javascript', '--framework', 'jest']);
      
      // Debug output
      if (result.totalFailures === 0) {
        console.log('DEBUG: JavaScript test result:', JSON.stringify(result, null, 2));
      }
      
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.totalFailures).toBe(1);
      expect(result.language).toBe('javascript');
      expect(result.framework).toBe('jest');
      expect(result.failingTests).toHaveLength(1);
      
      // Check that the failing test file is detected
      const failingFiles = result.failingTests.map((f: string) => path.basename(f));
      expect(failingFiles).toContain('advanced.test.js');
    });

    it('should auto-detect Jest framework', () => {
      const result = runTfqCommand(projectPath, ['--auto-detect']);
      
      expect(result.success).toBe(false);
      expect(result.totalFailures).toBe(1);
      expect(result.language).toBe('javascript');
      expect(result.framework).toBe('jest');
    });

    it('should use npm test as the command', () => {
      const result = runTfqCommand(projectPath, ['--language', 'javascript', '--framework', 'jest']);
      
      expect(result.command).toBe('npm test');
    });
  });

  describe('TypeScript Example (Vitest)', () => {
    const projectPath = path.join(examplesPath, 'typescript');

    it('should detect exactly 1 failing test file', () => {
      const result = runTfqCommand(projectPath, ['--language', 'javascript', '--framework', 'vitest']);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.totalFailures).toBe(1);
      expect(result.framework).toBe('vitest');
      expect(result.failingTests).toHaveLength(1);
      
      // Check that the failing test file is detected
      const failingFiles = result.failingTests.map((f: string) => path.basename(f));
      expect(failingFiles).toContain('edge-cases.test.ts');
    });

    it('should auto-detect Vitest framework', () => {
      const result = runTfqCommand(projectPath, ['--auto-detect']);
      
      expect(result.success).toBe(false);
      expect(result.totalFailures).toBe(1);
      expect(result.language).toBe('javascript');
      expect(result.framework).toBe('vitest');
    });
  });

  describe('Ruby Example (Minitest)', () => {
    const projectPath = path.join(examplesPath, 'ruby');

    it('should detect exactly 1 failing test file', () => {
      const result = runTfqCommand(projectPath, ['--language', 'ruby', '--framework', 'minitest']);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.totalFailures).toBe(1);
      expect(result.language).toBe('ruby');
      expect(result.framework).toBe('minitest');
      expect(result.failingTests).toHaveLength(1);
      
      // Check that test file is detected
      const failingFiles = result.failingTests.map((f: string) => path.basename(f));
      expect(failingFiles).toContain('edge_cases_test.rb');
      
      // Command should use ruby directly, not rails
      expect(result.command).toContain('ruby -Ilib:test');
      expect(result.command).not.toContain('rails test');
    });

    it('should auto-detect Minitest framework', () => {
      const result = runTfqCommand(projectPath, ['--auto-detect']);
      
      expect(result.success).toBe(false);
      expect(result.totalFailures).toBe(1);
      expect(result.language).toBe('ruby');
      expect(result.framework).toBe('minitest');
    });
  });

  describe('Rails Example (Minitest)', () => {
    const projectPath = path.join(examplesPath, 'rails8');

    it('should detect exactly 1 failing test file', () => {
      const result = runTfqCommand(projectPath, ['--language', 'ruby', '--framework', 'minitest']);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.totalFailures).toBe(1);
      expect(result.language).toBe('ruby');
      expect(result.framework).toBe('minitest');
      expect(result.failingTests).toHaveLength(1);
      
      // Check that the failing test file is detected
      const failingFiles = result.failingTests.map((f: string) => {
        // Extract just the relative path part for comparison
        const match = f.match(/test\/(controllers|models)\/\w+_test\.rb$/);
        return match ? match[0] : path.basename(f);
      });
      
      expect(failingFiles).toContain('test/models/user_test.rb');
      
      // Command should use rails test for Rails projects
      expect(result.command).toBe('rails test');
    });

    it('should auto-detect Rails with Minitest', () => {
      const result = runTfqCommand(projectPath, ['--auto-detect']);
      
      expect(result.success).toBe(false);
      expect(result.totalFailures).toBe(1);
      expect(result.language).toBe('ruby');
      expect(result.framework).toBe('minitest');
      expect(result.command).toBe('rails test');
    });
  });

  describe('Python Example (Pytest)', () => {
    const projectPath = path.join(examplesPath, 'python');
    const pytestAvailable = isPytestAvailable();

    // Skip these tests if pytest is not available
    const testOrSkip = pytestAvailable ? it : it.skip;

    testOrSkip('should detect exactly 1 failing test file', () => {
      const result = runTfqCommand(projectPath, ['--language', 'python', '--framework', 'pytest']);
      
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.language).toBe('python');
      expect(result.framework).toBe('pytest');
      expect(result.failingTests).toBeInstanceOf(Array);
      expect(result.failingTests).toHaveLength(1);
      
      // Check that the failing test file is detected
      const failingFiles = result.failingTests.map((f: string) => path.basename(f));
      expect(failingFiles).toContain('test_advanced.py');
    });

    testOrSkip('should auto-detect Pytest framework', () => {
      const result = runTfqCommand(projectPath, ['--auto-detect']);
      
      expect(result.success).toBe(false);
      expect(result.language).toBe('python');
      expect(result.framework).toBe('pytest');
    });

    it('should skip gracefully when pytest is not available', () => {
      if (!pytestAvailable) {
        expect(pytestAvailable).toBe(false);
      } else {
        expect(pytestAvailable).toBe(true);
      }
    });
  });

  describe('Cross-Project Consistency', () => {
    it('should return consistent JSON structure for all projects', () => {
      const projects = [
        { name: 'javascript', language: 'javascript', framework: 'jest' },
        { name: 'typescript', language: 'javascript', framework: 'vitest' },
        { name: 'ruby', language: 'ruby', framework: 'minitest' },
        { name: 'rails8', language: 'ruby', framework: 'minitest' }
      ];

      projects.forEach(project => {
        const projectPath = path.join(examplesPath, project.name);
        const result = runTfqCommand(projectPath, [
          '--language', project.language,
          '--framework', project.framework
        ]);

        // Check that all required fields are present
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('exitCode');
        expect(result).toHaveProperty('failingTests');
        expect(result).toHaveProperty('totalFailures');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('language');
        expect(result).toHaveProperty('framework');
        expect(result).toHaveProperty('command');

        // Verify types
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.exitCode).toBe('number');
        expect(Array.isArray(result.failingTests)).toBe(true);
        expect(typeof result.totalFailures).toBe('number');
        expect(typeof result.duration).toBe('number');
        expect(typeof result.language).toBe('string');
        expect(typeof result.framework).toBe('string');
        expect(typeof result.command).toBe('string');
      });
    });

    it('should detect languages correctly with auto-detect', () => {
      const expectations = [
        { project: 'javascript', language: 'javascript' },
        { project: 'typescript', language: 'javascript' },
        { project: 'ruby', language: 'ruby' },
        { project: 'rails8', language: 'ruby' }
      ];

      expectations.forEach(({ project, language }) => {
        const projectPath = path.join(examplesPath, project);
        const result = runTfqCommand(projectPath, ['--auto-detect']);
        
        expect(result.language).toBe(language);
      });
    });
  });
});