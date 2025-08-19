import { TestRunner } from '../src/test-runner';
import { execSync } from 'child_process';

jest.mock('child_process');

describe('TestRunner', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default values when no options provided', () => {
      const runner = new TestRunner();
      expect(runner['framework']).toBe('jest');
      expect(runner['command']).toBe('npm test');
    });

    it('should use provided options', () => {
      const runner = new TestRunner({
        framework: 'mocha',
        command: 'npm run test:integration'
      });
      expect(runner['framework']).toBe('mocha');
      expect(runner['command']).toBe('npm run test:integration');
    });
  });

  describe('run', () => {
    it('should handle successful test run', () => {
      mockExecSync.mockReturnValue('All tests passed\n');

      const runner = new TestRunner();
      const result = runner.run();

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.failingTests).toEqual([]);
      expect(result.totalFailures).toBe(0);
      expect(result.framework).toBe('jest');
      expect(result.command).toBe('npm test');
      expect(result.stdout).toBe('All tests passed\n');
      expect(result.stderr).toBe('');
      expect(result.error).toBeNull();
    });

    it('should extract failing tests for Jest', () => {
      const jestOutput = `
        PASS src/tests/passing.test.ts
        FAIL src/tests/auth.test.ts
        FAIL src/tests/api.test.ts
        PASS src/tests/utils.test.ts
      `;

      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = jestOutput;
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner({ framework: 'jest' });
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.failingTests).toEqual([
        'src/tests/auth.test.ts',
        'src/tests/api.test.ts'
      ]);
      expect(result.totalFailures).toBe(2);
    });

    it('should extract failing tests for Mocha', () => {
      const mochaOutput = `
        ✓ passing test
        1) src/tests/auth.test.js:
           AssertionError: expected true to be false
        2) src/tests/api.test.js:
           Error: Connection refused
        ✓ another passing test
      `;

      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = mochaOutput;
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner({ framework: 'mocha' });
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.failingTests).toEqual([
        'src/tests/auth.test.js',
        'src/tests/api.test.js'
      ]);
      expect(result.totalFailures).toBe(2);
    });

    it('should extract failing tests for Vitest', () => {
      const vitestOutput = `
        ✓ src/tests/passing.test.ts
        ❯ src/tests/auth.test.ts
          × should authenticate user
        ❯ src/tests/api.spec.ts
          × should fetch data
        ✓ src/tests/utils.test.ts
      `;

      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = vitestOutput;
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner({ framework: 'vitest' });
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.failingTests).toEqual([
        'src/tests/auth.test.ts',
        'src/tests/api.spec.ts'
      ]);
      expect(result.totalFailures).toBe(2);
    });

    it('should handle duplicate test paths', () => {
      const jestOutput = `
        FAIL src/tests/auth.test.ts
        FAIL src/tests/auth.test.ts
        FAIL src/tests/api.test.ts
      `;

      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = jestOutput;
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner({ framework: 'jest' });
      const result = runner.run();

      expect(result.failingTests).toEqual([
        'src/tests/auth.test.ts',
        'src/tests/api.test.ts'
      ]);
      expect(result.totalFailures).toBe(2);
    });

    it('should handle stderr output', () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = 'FAIL src/tests/auth.test.ts';
        error.stderr = 'Warning: deprecated API';
        throw error;
      });

      const runner = new TestRunner();
      const result = runner.run();

      expect(result.stdout).toContain('FAIL src/tests/auth.test.ts');
      expect(result.stderr).toContain('Warning: deprecated API');
      expect(result.failingTests).toEqual(['src/tests/auth.test.ts']);
    });

    it('should measure test duration', () => {
      mockExecSync.mockReturnValue('All tests passed\n');

      const runner = new TestRunner();
      const result = runner.run();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should handle no failing tests found in failed run', () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = 'Some error occurred but no test paths in output';
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner();
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.failingTests).toEqual([]);
      expect(result.totalFailures).toBe(0);
    });
  });

  describe('static methods', () => {
    describe('getFrameworks', () => {
      it('should return all supported frameworks', () => {
        const frameworks = TestRunner.getFrameworks();
        expect(frameworks).toEqual(['jest', 'mocha', 'vitest']);
      });
    });

    describe('isValidFramework', () => {
      it('should return true for valid frameworks', () => {
        expect(TestRunner.isValidFramework('jest')).toBe(true);
        expect(TestRunner.isValidFramework('mocha')).toBe(true);
        expect(TestRunner.isValidFramework('vitest')).toBe(true);
      });

      it('should return false for invalid frameworks', () => {
        expect(TestRunner.isValidFramework('jasmine')).toBe(false);
        expect(TestRunner.isValidFramework('qunit')).toBe(false);
        expect(TestRunner.isValidFramework('')).toBe(false);
      });
    });
  });
});