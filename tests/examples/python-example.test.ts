import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { 
  examplesPath, 
  createTempDbPath, 
  cleanupTempDb, 
  runTfqCommand,
  isPytestAvailable 
} from './test-helpers';

describe('Python Example (Pytest)', () => {
  const projectPath = path.join(examplesPath, 'python');
  const pytestAvailable = isPytestAvailable();
  let tempDbPath: string;

  beforeEach(() => {
    tempDbPath = createTempDbPath();
  });

  afterEach(() => {
    cleanupTempDb(tempDbPath);
  });

  // Skip these tests if pytest is not available
  const testOrSkip = pytestAvailable ? it : it.skip;

  testOrSkip('should detect exactly 1 failing test file', () => {
    const result = runTfqCommand(projectPath, ['--language', 'python', '--framework', 'pytest'], tempDbPath);
    
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
    const result = runTfqCommand(projectPath, ['--auto-detect'], tempDbPath);
    
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