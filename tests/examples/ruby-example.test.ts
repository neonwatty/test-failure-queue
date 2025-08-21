import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { 
  examplesPath, 
  createTempDbPath, 
  cleanupTempDb, 
  runTfqCommand 
} from './test-helpers';

describe('Ruby Example (Minitest)', () => {
  const projectPath = path.join(examplesPath, 'ruby');
  let tempDbPath: string;

  beforeEach(() => {
    tempDbPath = createTempDbPath();
  });

  afterEach(() => {
    cleanupTempDb(tempDbPath);
  });

  it('should detect exactly 1 failing test file', () => {
    const result = runTfqCommand(projectPath, ['--language', 'ruby', '--framework', 'minitest'], tempDbPath);
    
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
    const result = runTfqCommand(projectPath, ['--auto-detect'], tempDbPath);
    
    expect(result.success).toBe(false);
    expect(result.totalFailures).toBe(1);
    expect(result.language).toBe('ruby');
    expect(result.framework).toBe('minitest');
  });
});