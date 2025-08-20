import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
const kill = require('tree-kill');

describe('CLI - Multi-Language Support (Integration)', () => {
  const cliPath = path.join(__dirname, '../..', 'src', 'cli.ts');
  const testDbPath = path.join(os.tmpdir(), 'test-cli-multi-lang-queue.db');
  
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
      expect(result.stdout).toContain('minitest');
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

  describe('run-tests command with languages', () => {
    it('should list frameworks for JavaScript', async () => {
      const result = await runCLI(['run-tests', '--language', 'javascript', '--list-frameworks']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Available frameworks for javascript');
      expect(result.stdout).toContain('jest');
      expect(result.stdout).toContain('mocha');
      expect(result.stdout).toContain('vitest');
      expect(result.stdout).toContain('jasmine');
      expect(result.stdout).toContain('ava');
    });

    it('should list frameworks for Python', async () => {
      const result = await runCLI(['run-tests', '--language', 'python', '--list-frameworks']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Available frameworks for python');
      expect(result.stdout).toContain('pytest');
      expect(result.stdout).toContain('unittest');
    });

    it('should list frameworks for Ruby', async () => {
      const result = await runCLI(['run-tests', '--language', 'ruby', '--list-frameworks']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Available frameworks for ruby');
      expect(result.stdout).toContain('minitest');
    });

    it('should output JSON when listing frameworks with --json', async () => {
      const result = await runCLI(['run-tests', '--language', 'python', '--list-frameworks', '--json']);
      
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.success).toBe(true);
      expect(json.language).toBe('python');
      expect(json.frameworks).toBeInstanceOf(Array);
      expect(json.frameworks).toContain('pytest');
      expect(json.frameworks).toContain('unittest');
    });

    it('should error on invalid language', async () => {
      const result = await runCLI(['run-tests', '--language', 'cobol']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unsupported language: cobol');
    });

    it('should error on invalid framework for language', async () => {
      const result = await runCLI(['run-tests', '--language', 'python', '--framework', 'jest']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid framework');
    });

    it('should error when --list-frameworks is used without language', async () => {
      const result = await runCLI(['run-tests', '--list-frameworks']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Please specify a language');
    });

    it('should run JavaScript tests with default framework', async () => {
      // Pass a command that exits quickly instead of running actual tests
      const result = await runCLI(['run-tests', 'echo "test output"', '--language', 'javascript'], 10000);
      
      // The command will fail since we don't have actual tests, but we can check the output
      expect(result.stdout).toContain('Running tests');
      expect(result.stdout).toContain('javascript');
      expect(result.stdout).toContain('jest'); // Default framework
    }, 15000); // Increase timeout since it runs actual tests

    it('should run Python tests with specified framework', async () => {
      // Pass a command that exits quickly instead of running actual tests
      const result = await runCLI(['run-tests', 'echo "test output"', '--language', 'python', '--framework', 'pytest'], 10000);
      
      // The command will fail since we don't have actual tests, but we can check the output
      expect(result.stdout).toContain('Running tests');
      expect(result.stdout).toContain('python');
      expect(result.stdout).toContain('pytest');
    }, 15000); // Increase timeout

    it('should auto-detect language when --auto-detect is used', async () => {
      // Pass a command that exits quickly instead of running actual tests
      const result = await runCLI(['run-tests', 'echo "test output"', '--auto-detect'], 10000);
      
      // Should detect JavaScript since we have package.json
      expect(result.stdout).toContain('Language: javascript');
    }, 15000); // Increase timeout since it runs actual tests
  });

  describe('Help text', () => {
    it('should show language options in run-tests help', async () => {
      const result = await runCLI(['run-tests', '--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('--language');
      expect(result.stdout).toContain('--framework');
      expect(result.stdout).toContain('--auto-detect');
      expect(result.stdout).toContain('--list-frameworks');
    });

    it('should show languages command in main help', async () => {
      const result = await runCLI(['--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('languages');
      expect(result.stdout).toContain('List all supported languages');
    });
  });
});