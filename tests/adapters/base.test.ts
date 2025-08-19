import { BaseAdapter, TestPattern, ParsedTestOutput } from '../../src/adapters/base';

class TestAdapter extends BaseAdapter {
  readonly language = 'test';
  readonly supportedFrameworks = ['test-framework-1', 'test-framework-2'];
  readonly defaultFramework = 'test-framework-1';
  
  detectFramework(projectPath?: string): string | null {
    return 'test-framework-1';
  }
  
  getTestCommand(framework: string, testPath?: string): string {
    return testPath ? `test ${testPath}` : 'test';
  }
  
  getFailurePatterns(framework: string): TestPattern[] {
    return [
      {
        pattern: /FAIL:\s+(.+?)\.js:(\d+)/,
        type: 'failure',
        extractLocation: (match) => ({
          file: match[1] + '.js',
          line: parseInt(match[2], 10)
        })
      },
      {
        pattern: /ERROR:\s+(.+?)\.js/,
        type: 'error',
        extractLocation: (match) => ({
          file: match[1] + '.js',
          line: undefined
        })
      }
    ];
  }
  
  parseTestOutput(output: string, framework: string): ParsedTestOutput {
    const patterns = this.getFailurePatterns(framework);
    const failures = this.extractFailures(output, patterns);
    const errors = this.extractErrors(output, patterns);
    const summary = this.extractSummary(output);
    
    const passed = failures.length === 0 && errors.length === 0;
    const failingTests = failures.map(f => f.file);
    
    return {
      passed,
      failingTests,
      failures,
      errors,
      summary
    };
  }
}

describe('BaseAdapter', () => {
  let adapter: TestAdapter;
  
  beforeEach(() => {
    adapter = new TestAdapter();
  });
  
  describe('validateFramework', () => {
    it('should return true for supported frameworks', () => {
      expect(adapter.validateFramework('test-framework-1')).toBe(true);
      expect(adapter.validateFramework('test-framework-2')).toBe(true);
    });
    
    it('should return false for unsupported frameworks', () => {
      expect(adapter.validateFramework('unknown-framework')).toBe(false);
    });
    
    it('should be case-insensitive', () => {
      expect(adapter.validateFramework('TEST-FRAMEWORK-1')).toBe(true);
    });
  });
  
  describe('getDefaultTimeout', () => {
    it('should return 30000ms by default', () => {
      expect(adapter.getDefaultTimeout()).toBe(30000);
    });
  });
  
  describe('extractFailures', () => {
    it('should extract failures from output', () => {
      const output = `
        Running tests...
        FAIL: test.js:10
        FAIL: another.js:20
        Tests completed
      `;
      
      const result = adapter.parseTestOutput(output, 'test-framework-1');
      expect(result.failures).toHaveLength(2);
      expect(result.failures[0]).toEqual({
        name: 'FAIL: test.js:10',
        file: 'test.js',
        line: 10,
        message: expect.stringContaining('FAIL: test.js:10')
      });
      expect(result.failures[1]).toEqual({
        name: 'FAIL: another.js:20',
        file: 'another.js',
        line: 20,
        message: expect.stringContaining('FAIL: another.js:20')
      });
    });
  });
  
  describe('extractErrors', () => {
    it('should extract errors from output', () => {
      const output = `
        Running tests...
        ERROR: test.js
        ERROR: another.js
        Tests completed
      `;
      
      const result = adapter.parseTestOutput(output, 'test-framework-1');
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toEqual({
        name: 'ERROR: test.js',
        file: 'test.js',
        message: expect.stringContaining('ERROR: test.js')
      });
      expect(result.errors[1]).toEqual({
        name: 'ERROR: another.js',
        file: 'another.js',
        message: expect.stringContaining('ERROR: another.js')
      });
    });
  });
  
  describe('extractSummary', () => {
    it('should extract summary from common test output formats', () => {
      const output = `
        Running tests...
        10 tests, 7 passed, 2 failed, 1 skipped
      `;
      
      const result = adapter.parseTestOutput(output, 'test-framework-1');
      expect(result.summary).toEqual({
        total: 10,
        passed: 7,
        failed: 2,
        skipped: 1
      });
    });
    
    it('should calculate total if not explicitly provided', () => {
      const output = `
        7 passed, 2 failed, 1 skipped
      `;
      
      const result = adapter.parseTestOutput(output, 'test-framework-1');
      expect(result.summary.total).toBe(10);
    });
  });
  
  describe('parseTestOutput', () => {
    it('should return passed=true when no failures or errors', () => {
      const output = `
        Running tests...
        All tests passed!
        10 tests, 10 passed
      `;
      
      const result = adapter.parseTestOutput(output, 'test-framework-1');
      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should return passed=false when failures exist', () => {
      const output = `
        Running tests...
        FAIL: test.js:10
        9 passed, 1 failed
      `;
      
      const result = adapter.parseTestOutput(output, 'test-framework-1');
      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(1);
    });
    
    it('should return passed=false when errors exist', () => {
      const output = `
        Running tests...
        ERROR: test.js
        9 passed, 1 error
      `;
      
      const result = adapter.parseTestOutput(output, 'test-framework-1');
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
});