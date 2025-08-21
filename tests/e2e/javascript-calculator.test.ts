import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import {
  runCommand,
  createTempDir,
  cleanupDir,
  copyDir,
  resetFile,
  outputContains,
  getTfqBinPath,
  getExamplesPath,
  verifyFileContent,
  readFile
} from './test-utils';

describe('E2E: JavaScript Calculator Demo', () => {
  let tempDir: string;
  let projectDir: string;
  let tfqBin: string;
  let tempDbPath: string;

  beforeEach(() => {
    // Create temp directory and copy the example
    tempDir = createTempDir('tfq-e2e-js-calc-');
    projectDir = path.join(tempDir, 'javascript-calculator');
    tempDbPath = path.join(tempDir, 'test.db');
    
    // Copy the JavaScript calculator example
    const sourceDir = path.join(getExamplesPath(), 'javascript-calculator');
    copyDir(sourceDir, projectDir);
    
    tfqBin = getTfqBinPath();
    
    // Install dependencies
    runCommand('npm install', { cwd: projectDir, timeout: 30000 });
  });

  afterEach(() => {
    // Cleanup
    cleanupDir(tempDir);
  });

  it('should detect failing tests in JavaScript calculator', () => {
    // Reset to buggy state
    const buggyCalculator = `/**
 * Simple calculator with intentional bugs for TFQ AI fixing demo
 */

function add(a, b) {
  // BUG: Should return a + b, not a - b
  return a - b;
}

function subtract(a, b) {
  // This function is correct
  return a - b;
}

function multiply(a, b) {
  // BUG: Should return a * b, not a + b
  return a + b;
}

function divide(a, b) {
  // BUG: Should handle division by zero
  return a / b;
}

function power(a, b) {
  // BUG: Should use Math.pow or ** operator
  return a * b;
}

module.exports = {
  add,
  subtract,
  multiply,
  divide,
  power
};`;

    resetFile(path.join(projectDir, 'calculator.js'), buggyCalculator);
    
    // Run tests and verify failures
    const testResult = runCommand('npm test', { cwd: projectDir });
    expect(testResult.exitCode).not.toBe(0);
    expect(outputContains(testResult.stdout, 'FAIL')).toBe(true);
    expect(outputContains(testResult.stdout, 'should add two positive numbers')).toBe(true);
  });

  it('should add failing tests to TFQ queue', () => {
    // Clear queue first
    runCommand(`${tfqBin} clear`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    
    // Run TFQ to detect and add failures
    const result = runCommand(
      `${tfqBin} run-tests --auto-detect --auto-add --priority 5`,
      {
        cwd: projectDir,
        env: { TFQ_DB_PATH: tempDbPath }
      }
    );
    
    expect(result.exitCode).toBe(0);
    expect(outputContains(result.stdout, 'Added to queue')).toBe(true);
    expect(outputContains(result.stdout, 'calculator.test.js')).toBe(true);
    
    // Verify queue contains the test
    const listResult = runCommand(`${tfqBin} list`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    
    expect(outputContains(listResult.stdout, 'calculator.test.js')).toBe(true);
    expect(outputContains(listResult.stdout, 'Priority: 5')).toBe(true);
  });

  it('should show queue statistics', () => {
    // Clear and add to queue
    runCommand(`${tfqBin} clear`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    
    runCommand(
      `${tfqBin} run-tests --auto-detect --auto-add --priority 5`,
      {
        cwd: projectDir,
        env: { TFQ_DB_PATH: tempDbPath }
      }
    );
    
    // Check stats
    const statsResult = runCommand(`${tfqBin} stats`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    
    expect(statsResult.exitCode).toBe(0);
    expect(outputContains(statsResult.stdout, 'Total files: 1')).toBe(true);
    expect(outputContains(statsResult.stdout, 'Average priority: 5')).toBe(true);
  });

  it('should perform dry run without modifying files', () => {
    // Clear and add to queue
    runCommand(`${tfqBin} clear`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    
    runCommand(
      `${tfqBin} run-tests --auto-detect --auto-add`,
      {
        cwd: projectDir,
        env: { TFQ_DB_PATH: tempDbPath }
      }
    );
    
    // Get original content
    const originalContent = readFile(path.join(projectDir, 'calculator.js'));
    
    // Run dry run
    const dryRunResult = runCommand(
      `${tfqBin} fix-tests --dry-run`,
      {
        cwd: projectDir,
        env: { TFQ_DB_PATH: tempDbPath }
      }
    );
    
    expect(dryRunResult.exitCode).toBe(0);
    expect(outputContains(dryRunResult.stdout, 'Dry run mode')).toBe(true);
    
    // Verify file wasn't modified
    const afterContent = readFile(path.join(projectDir, 'calculator.js'));
    expect(afterContent).toBe(originalContent);
  });

  it('should handle queue persistence across commands', () => {
    // Clear queue
    runCommand(`${tfqBin} clear`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    
    // Add to queue
    runCommand(
      `${tfqBin} run-tests --auto-detect --auto-add --priority 7`,
      {
        cwd: projectDir,
        env: { TFQ_DB_PATH: tempDbPath }
      }
    );
    
    // List should show the item
    const listResult1 = runCommand(`${tfqBin} list`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    expect(outputContains(listResult1.stdout, 'calculator.test.js')).toBe(true);
    expect(outputContains(listResult1.stdout, 'Priority: 7')).toBe(true);
    
    // Running list again should show the same item (persistence)
    const listResult2 = runCommand(`${tfqBin} list`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    expect(outputContains(listResult2.stdout, 'calculator.test.js')).toBe(true);
    expect(outputContains(listResult2.stdout, 'Priority: 7')).toBe(true);
  });

  it('should detect JavaScript/Jest framework automatically', () => {
    const result = runCommand(
      `${tfqBin} run-tests --auto-detect --json`,
      {
        cwd: projectDir,
        env: { TFQ_DB_PATH: tempDbPath }
      }
    );
    
    expect(result.exitCode).toBe(0);
    
    // Parse JSON output
    const jsonOutput = JSON.parse(result.stdout);
    expect(jsonOutput.language).toBe('javascript');
    expect(jsonOutput.framework).toBe('jest');
  });

  it('should handle explicit language and framework specification', () => {
    const result = runCommand(
      `${tfqBin} run-tests --language javascript --framework jest --json`,
      {
        cwd: projectDir,
        env: { TFQ_DB_PATH: tempDbPath }
      }
    );
    
    expect(result.exitCode).toBe(0);
    
    const jsonOutput = JSON.parse(result.stdout);
    expect(jsonOutput.language).toBe('javascript');
    expect(jsonOutput.framework).toBe('jest');
    expect(jsonOutput.failures).toBeGreaterThan(0);
  });

  it('should clear queue successfully', () => {
    // Add to queue
    runCommand(
      `${tfqBin} run-tests --auto-detect --auto-add`,
      {
        cwd: projectDir,
        env: { TFQ_DB_PATH: tempDbPath }
      }
    );
    
    // Verify item in queue
    const listBefore = runCommand(`${tfqBin} list`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    expect(outputContains(listBefore.stdout, 'calculator.test.js')).toBe(true);
    
    // Clear queue
    const clearResult = runCommand(`${tfqBin} clear`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    expect(clearResult.exitCode).toBe(0);
    
    // Verify queue is empty
    const listAfter = runCommand(`${tfqBin} list`, {
      env: { TFQ_DB_PATH: tempDbPath }
    });
    expect(outputContains(listAfter.stdout, 'Queue is empty')).toBe(true);
  });
});