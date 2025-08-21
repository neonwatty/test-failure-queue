import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { 
  examplesPath, 
  createTempDbPath, 
  cleanupTempDb, 
  runTfqCommand 
} from './test-helpers';

describe('TypeScript Example (Vitest)', () => {
  const projectPath = path.join(examplesPath, 'typescript');
  let tempDbPath: string;

  beforeEach(() => {
    tempDbPath = createTempDbPath();
  });

  afterEach(() => {
    cleanupTempDb(tempDbPath);
  });

  it('should detect failing test files', () => {
    const result = runTfqCommand(projectPath, ['--language', 'javascript', '--framework', 'vitest'], tempDbPath);
    
    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
    // After reset, multiple test files may fail
    expect(result.totalFailures).toBeGreaterThanOrEqual(1);
    expect(result.framework).toBe('vitest');
    expect(result.failingTests.length).toBeGreaterThanOrEqual(1);
    
    // Check that at least one failing test file is detected
    const failingFiles = result.failingTests.map((f: string) => path.basename(f));
    expect(failingFiles).toContain('edge-cases.test.ts');
  });

  it('should auto-detect Vitest framework', () => {
    const result = runTfqCommand(projectPath, ['--auto-detect'], tempDbPath);
    
    expect(result.success).toBe(false);
    expect(result.totalFailures).toBeGreaterThanOrEqual(1);
    expect(result.language).toBe('javascript');
    expect(result.framework).toBe('vitest');
  });
});