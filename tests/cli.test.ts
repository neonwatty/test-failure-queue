import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
const kill = require('tree-kill');

describe('CLI Commands', () => {
  const cliPath = path.join(__dirname, '..', 'src', 'cli.ts');
  const testDbPath = path.join(os.tmpdir(), 'test-cli-queue.db');
  
  // Track active child processes for cleanup
  const activeProcesses = new Set<any>();
  
  beforeEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Clean up any remaining child processes
    activeProcesses.forEach(child => {
      if (!child.killed && child.pid) {
        // Use tree-kill to ensure all child processes are killed
        kill(child.pid, 'SIGKILL');
      }
    });
    activeProcesses.clear();
  });

  function runCLI(args: string[], timeout = 5000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const env = { ...process.env, TFQ_DB_PATH: testDbPath };
      const child = spawn('npx', ['tsx', cliPath, ...args], { 
        env
      });
      
      // Track this process
      activeProcesses.add(child);
      
      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout;
      let resolved = false;
      
      // Cleanup function
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        activeProcesses.delete(child);
        if (!child.killed && child.pid) {
          // Use tree-kill to kill the entire process tree
          kill(child.pid, 'SIGTERM', (err: any) => {
            if (err) {
              // Try SIGKILL if SIGTERM failed
              kill(child.pid, 'SIGKILL');
            }
          });
        }
      };
      
      // Set timeout
      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(new Error(`CLI command timed out after ${timeout}ms`));
        }
      }, timeout);
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (exitCode) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({ stdout, stderr, exitCode: exitCode || 0 });
        }
      });
      
      child.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(error);
        }
      });
    });
  }

  describe('languages command', () => {
    it('should list all supported languages and frameworks', async () => {
      const result = await runCLI(['languages']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Supported Languages and Frameworks');
      expect(result.stdout).toContain('javascript:');
      expect(result.stdout).toContain('ruby:');
      expect(result.stdout).toContain('python:');
      expect(result.stdout).toContain('jest');
      expect(result.stdout).toContain('mocha');
      expect(result.stdout).toContain('rspec');
      expect(result.stdout).toContain('pytest');
    });

    it('should output JSON format when --json flag is used', async () => {
      const result = await runCLI(['languages', '--json']);
      
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.success).toBe(true);
      expect(json.languages).toBeInstanceOf(Array);
      expect(json.languages.length).toBeGreaterThan(0);
      
      const jsAdapter = json.languages.find((l: any) => l.language === 'javascript');
      expect(jsAdapter).toBeDefined();
      expect(jsAdapter.supportedFrameworks).toContain('jest');
      expect(jsAdapter.supportedFrameworks).toContain('mocha');
      expect(jsAdapter.supportedFrameworks).toContain('vitest');
    });
  });

  describe('run-tests command', () => {
    describe('--list-frameworks flag', () => {
      it('should list frameworks for JavaScript', async () => {
        const result = await runCLI(['run-tests', '--list-frameworks', '--language', 'javascript']);
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Available frameworks for javascript');
        expect(result.stdout).toContain('jest');
        expect(result.stdout).toContain('mocha');
        expect(result.stdout).toContain('vitest');
        expect(result.stdout).toContain('jasmine');
        expect(result.stdout).toContain('ava');
      });

      it('should list frameworks for Ruby', async () => {
        const result = await runCLI(['run-tests', '--list-frameworks', '--language', 'ruby']);
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Available frameworks for ruby');
        expect(result.stdout).toContain('minitest');
        expect(result.stdout).toContain('rspec');
        expect(result.stdout).toContain('test-unit');
        expect(result.stdout).toContain('cucumber');
      });

      it('should list frameworks for Python', async () => {
        const result = await runCLI(['run-tests', '--list-frameworks', '--language', 'python']);
        
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Available frameworks for python');
        expect(result.stdout).toContain('pytest');
        expect(result.stdout).toContain('unittest');
        expect(result.stdout).toContain('django');
        expect(result.stdout).toContain('nose2');
      });

      it('should error when no language is specified without auto-detect', async () => {
        const result = await runCLI(['run-tests', '--list-frameworks']);
        
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Please specify a language');
      });

      it('should output JSON format when --json flag is used', async () => {
        const result = await runCLI(['run-tests', '--list-frameworks', '--language', 'python', '--json']);
        
        expect(result.exitCode).toBe(0);
        const json = JSON.parse(result.stdout);
        expect(json.success).toBe(true);
        expect(json.language).toBe('python');
        expect(json.frameworks).toContain('pytest');
        expect(json.frameworks).toContain('unittest');
      });
    });

    describe('language and framework validation', () => {
      it('should validate unsupported language', async () => {
        const result = await runCLI(['run-tests', '--language', 'rust', '--json']);
        
        const json = JSON.parse(result.stdout);
        expect(json.success).toBe(false);
        expect(json.error).toContain('Unsupported language: rust');
      });

      it('should validate invalid framework for language', async () => {
        const result = await runCLI(['run-tests', '--language', 'python', '--framework', 'jest', '--json']);
        
        const json = JSON.parse(result.stdout);
        expect(json.success).toBe(false);
        expect(json.error).toContain("Invalid framework 'jest' for python");
      });

      it('should accept valid language and framework combination', async () => {
        const result = await runCLI(['run-tests', '--language', 'ruby', '--framework', 'rspec', 'echo "test"', '--json']);
        
        const json = JSON.parse(result.stdout);
        expect(json.framework).toBe('rspec');
        expect(json.language).toBe('ruby');
      });
    });

    describe('backward compatibility', () => {
      it('should default to JavaScript when no language is specified', async () => {
        const result = await runCLI(['run-tests', '--framework', 'jest', 'echo "test"', '--json']);
        
        const json = JSON.parse(result.stdout);
        expect(json.framework).toBe('jest');
        expect(json.language).toBe('javascript');
      });

      it('should work with just framework flag (legacy behavior)', async () => {
        const result = await runCLI(['run-tests', '--framework', 'mocha', 'echo "test"', '--json']);
        
        const json = JSON.parse(result.stdout);
        expect(json.framework).toBe('mocha');
        expect(json.language).toBe('javascript');
      });

      it('should use default framework when not specified', async () => {
        const result = await runCLI(['run-tests', 'echo "test"', '--json']);
        
        const json = JSON.parse(result.stdout);
        expect(json.framework).toBe('jest'); // Default for JavaScript
        expect(json.language).toBe('javascript');
      });
    });

    describe('auto-detect functionality', () => {
      it('should auto-detect JavaScript project', async () => {
        // Current project has package.json, so should detect JavaScript
        const result = await runCLI(['run-tests', '--auto-detect', '--list-frameworks', '--json']);
        
        const json = JSON.parse(result.stdout);
        expect(json.success).toBe(true);
        expect(json.language).toBe('javascript');
        expect(json.frameworks).toContain('jest');
      });

      it('should auto-detect framework from package.json', async () => {
        const result = await runCLI(['run-tests', '--auto-detect', 'echo "test"', '--json']);
        
        const json = JSON.parse(result.stdout);
        expect(json.language).toBe('javascript');
        expect(json.framework).toBe('jest'); // Should detect from package.json
      });
    });

    describe('command execution', () => {
      it('should run custom command when provided', async () => {
        const result = await runCLI(['run-tests', 'echo "custom test"', '--json']);
        
        const json = JSON.parse(result.stdout);
        expect(json.command).toBe('echo "custom test"');
        expect(json.success).toBe(true);
      });

      it('should handle different languages with custom commands', async () => {
        const result = await runCLI(['run-tests', '--language', 'python', '--framework', 'pytest', 'echo "python test"', '--json']);
        
        const json = JSON.parse(result.stdout);
        expect(json.language).toBe('python');
        expect(json.framework).toBe('pytest');
        expect(json.command).toBe('echo "python test"');
      });
    });
  });

  describe('help command', () => {
    it('should show updated help for run-tests', async () => {
      const result = await runCLI(['run-tests', '--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--language');
      expect(result.stdout).toContain('--auto-detect');
      expect(result.stdout).toContain('--list-frameworks');
      expect(result.stdout).toContain('Programming language');
      expect(result.stdout).toContain('Auto-detect language and framework');
    });

    it('should show help for languages command', async () => {
      const result = await runCLI(['languages', '--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('List all supported languages');
      expect(result.stdout).toContain('--json');
    });
  });
});