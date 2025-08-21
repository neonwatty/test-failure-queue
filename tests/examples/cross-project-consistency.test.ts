import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { 
  examplesPath, 
  createTempDbPath, 
  cleanupTempDb, 
  runTfqCommand 
} from './test-helpers';

describe('Cross-Project Consistency', () => {
  let tempDbPath: string;

  beforeEach(() => {
    tempDbPath = createTempDbPath();
  });

  afterEach(() => {
    cleanupTempDb(tempDbPath);
  });

  it('should return consistent JSON structure for all projects', () => {
    const projects = [
      { name: 'javascript', language: 'javascript', framework: 'jest' },
      { name: 'typescript', language: 'javascript', framework: 'vitest' },
      { name: 'ruby', language: 'ruby', framework: 'minitest' }
    ];

    projects.forEach(project => {
      const projectPath = path.join(examplesPath, project.name);
      const result = runTfqCommand(projectPath, [
        '--language', project.language,
        '--framework', project.framework
      ], tempDbPath);

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
      { project: 'ruby', language: 'ruby' }
    ];

    expectations.forEach(({ project, language }) => {
      const projectPath = path.join(examplesPath, project);
      const result = runTfqCommand(projectPath, ['--auto-detect'], tempDbPath);
      
      expect(result.language).toBe(language);
    });
  });
});