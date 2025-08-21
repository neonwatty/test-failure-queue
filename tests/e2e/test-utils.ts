import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Utilities for end-to-end testing of provider examples
 */

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Execute a command synchronously and return the result
 */
export function runCommand(
  command: string,
  options: { cwd?: string; env?: Record<string, string>; timeout?: number } = {}
): CommandResult {
  try {
    const stdout = execSync(command, {
      encoding: 'utf8',
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      timeout: options.timeout || 60000,
      shell: '/bin/sh'
    });
    
    return {
      stdout,
      stderr: '',
      exitCode: 0
    };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1
    };
  }
}

/**
 * Create a temporary directory for testing
 */
export function createTempDir(prefix: string = 'tfq-e2e-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Clean up a directory
 */
export function cleanupDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Copy directory recursively
 */
export function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules, venv, and other build directories
      if (['node_modules', 'venv', '.venv', 'dist', 'build', '__pycache__'].includes(entry.name)) {
        continue;
      }
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Reset a file to specific content
 */
export function resetFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Check if a command output contains expected text
 */
export function outputContains(output: string, expected: string | RegExp): boolean {
  if (typeof expected === 'string') {
    return output.includes(expected);
  }
  return expected.test(output);
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Get the path to the tfq binary
 */
export function getTfqBinPath(): string {
  return path.join(__dirname, '../../bin/tfq');
}

/**
 * Get the path to the examples directory
 */
export function getExamplesPath(): string {
  return path.join(__dirname, '../../examples/providers');
}

/**
 * Mock Claude Code SDK responses for testing
 */
export function mockClaudeCodeResponse(fixedCode: string): void {
  // This would be implemented with actual mocking in a real test
  // For now, we'll use environment variables to control behavior
  process.env.TFQ_MOCK_CLAUDE = 'true';
  process.env.TFQ_MOCK_RESPONSE = JSON.stringify({
    success: true,
    changes: [{
      file: 'test.js',
      newContent: fixedCode
    }]
  });
}

/**
 * Clear all mocks
 */
export function clearMocks(): void {
  delete process.env.TFQ_MOCK_CLAUDE;
  delete process.env.TFQ_MOCK_RESPONSE;
}

/**
 * Verify file content matches expected
 */
export function verifyFileContent(filePath: string, expectedContent: string | RegExp): boolean {
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (typeof expectedContent === 'string') {
    return content === expectedContent;
  }
  
  return expectedContent.test(content);
}

/**
 * Get the content of a file
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}