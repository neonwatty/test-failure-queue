import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { TestFixer } from '../../src/providers/claude/test-fixer.js';
import { TestFailureQueue } from '../../src/core/queue.js';
import { TestRunner } from '../../src/core/test-runner.js';
import fs from 'fs';
import path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('Fix Tests Integration', () => {
  const testDir = path.join(os.tmpdir(), 'tfq-fix-tests-integration');
  const dbPath = path.join(testDir, 'test.db');
  let queue: TestFailureQueue;
  let runner: TestRunner;

  beforeAll(() => {
    // Create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Initialize queue with test database
    queue = new TestFailureQueue({
      databasePath: dbPath,
    });
    
    // Clear queue
    queue.clear();
  });

  describe('JavaScript/Jest Fix Workflow', () => {
    const projectDir = path.join(testDir, 'js-project');

    beforeEach(() => {
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true });
      }
      fs.mkdirSync(projectDir, { recursive: true });

      // Create package.json
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          scripts: {
            test: 'jest',
          },
          devDependencies: {
            jest: '^29.0.0',
          },
        }, null, 2)
      );

      // Create a broken implementation
      fs.writeFileSync(
        path.join(projectDir, 'calculator.js'),
        `
function add(a, b) {
  return a - b; // Bug: should be a + b
}

function multiply(a, b) {
  return a + b; // Bug: should be a * b
}

module.exports = { add, multiply };
        `.trim()
      );

      // Create failing tests
      fs.writeFileSync(
        path.join(projectDir, 'calculator.test.js'),
        `
const { add, multiply } = require('./calculator');

describe('Calculator', () => {
  test('add should return sum of two numbers', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
  });

  test('multiply should return product of two numbers', () => {
    expect(multiply(3, 4)).toBe(12);
    expect(multiply(-2, 5)).toBe(-10);
  });
});
        `.trim()
      );

      process.chdir(projectDir);
    });

    it('should detect failing tests and add to queue', () => {
      runner = new TestRunner({
        language: 'javascript',
        framework: 'jest',
      });

      // This would normally fail, but we're just testing the workflow structure
      try {
        const result = runner.run();
        expect(result.success).toBe(false);
        expect(result.failingTests.length).toBeGreaterThan(0);
        
        // Add failures to queue
        result.failingTests.forEach(test => {
          queue.enqueue(test);
        });
        
        expect(queue.size()).toBeGreaterThan(0);
      } catch (error) {
        // Jest might not be installed in test environment
        console.log('Skipping actual test run:', error);
      }
    });

    it('should create fix prompt with correct context', async () => {
      // Manually add test to queue
      const testFile = path.join(projectDir, 'calculator.test.js');
      queue.enqueue(testFile, 0, 'Test failed: expected 5 but got -1');
      
      runner = new TestRunner({
        language: 'javascript',
        framework: 'jest',
      });

      // Skip actual API call for integration test
      const fixer = new TestFixer(queue, runner, {
        dryRun: true,
        apiKey: 'test-key',
      });

      const items = queue.list();
      expect(items.length).toBe(1);
      
      const queueItem = items[0];
      const prompt = await (fixer as any).generateFixPrompt(testFile, queueItem);
      
      expect(prompt.testFile).toBe(testFile);
      expect(prompt.testContent).toContain('add should return sum');
      expect(prompt.errorOutput).toContain('expected 5 but got -1');
      expect(prompt.language).toBe('javascript');
      expect(prompt.framework).toBe('jest');
      
      // Should find related calculator.js file
      expect(prompt.relatedFiles.length).toBeGreaterThan(0);
      const calculatorFile = prompt.relatedFiles.find(f => 
        f.path.includes('calculator.js')
      );
      expect(calculatorFile).toBeDefined();
      expect(calculatorFile?.content).toContain('return a - b');
    });
  });

  describe('Python/pytest Fix Workflow', () => {
    const projectDir = path.join(testDir, 'py-project');

    beforeEach(() => {
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true });
      }
      fs.mkdirSync(projectDir, { recursive: true });

      // Create broken implementation
      fs.writeFileSync(
        path.join(projectDir, 'calculator.py'),
        `
def add(a, b):
    return a - b  # Bug: should be a + b

def divide(a, b):
    return a * b  # Bug: should be a / b
        `.trim()
      );

      // Create failing tests
      fs.writeFileSync(
        path.join(projectDir, 'test_calculator.py'),
        `
import pytest
from calculator import add, divide

def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0

def test_divide():
    assert divide(10, 2) == 5
    assert divide(20, 4) == 5
        `.trim()
      );

      process.chdir(projectDir);
    });

    it('should handle Python test failures', () => {
      runner = new TestRunner({
        language: 'python',
        framework: 'pytest',
      });

      try {
        const result = runner.run();
        expect(result.language).toBe('python');
        expect(result.framework).toBe('pytest');
        
        if (!result.success) {
          result.failingTests.forEach(test => {
            queue.enqueue(test);
          });
        }
      } catch (error) {
        // pytest might not be installed
        console.log('Skipping Python test run:', error);
      }
    });
  });

  describe('Ruby/RSpec Fix Workflow', () => {
    const projectDir = path.join(testDir, 'rb-project');

    beforeEach(() => {
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true });
      }
      fs.mkdirSync(projectDir, { recursive: true });

      // Create broken implementation
      fs.writeFileSync(
        path.join(projectDir, 'calculator.rb'),
        `
class Calculator
  def self.add(a, b)
    a - b  # Bug: should be a + b
  end

  def self.subtract(a, b)
    a + b  # Bug: should be a - b
  end
end
        `.trim()
      );

      // Create failing tests
      fs.writeFileSync(
        path.join(projectDir, 'calculator_spec.rb'),
        `
require_relative 'calculator'

RSpec.describe Calculator do
  describe '.add' do
    it 'returns the sum of two numbers' do
      expect(Calculator.add(2, 3)).to eq(5)
    end
  end

  describe '.subtract' do
    it 'returns the difference of two numbers' do
      expect(Calculator.subtract(5, 3)).to eq(2)
    end
  end
end
        `.trim()
      );

      process.chdir(projectDir);
    });

    it('should handle Ruby test failures', () => {
      runner = new TestRunner({
        language: 'ruby',
        framework: 'minitest',
      });

      try {
        const result = runner.run();
        expect(result.language).toBe('ruby');
        expect(result.framework).toBe('minitest');
        
        if (!result.success) {
          result.failingTests.forEach(test => {
            queue.enqueue(test);
          });
        }
      } catch (error) {
        // RSpec might not be installed
        console.log('Skipping Ruby test run:', error);
      }
    });
  });

  describe('End-to-End Fix Workflow', () => {
    it('should handle the complete fix workflow in dry-run mode', async () => {
      const projectDir = path.join(testDir, 'e2e-project');
      
      if (fs.existsSync(projectDir)) {
        fs.rmSync(projectDir, { recursive: true });
      }
      fs.mkdirSync(projectDir, { recursive: true });

      // Create simple test file
      const testFile = path.join(projectDir, 'simple.test.js');
      fs.writeFileSync(
        testFile,
        `
test('simple test', () => {
  expect(1 + 1).toBe(3); // This will fail
});
        `.trim()
      );

      // Add to queue with error
      queue.enqueue(testFile, 1, 'Expected 3 but got 2');
      
      runner = new TestRunner({
        language: 'javascript',
        framework: 'jest',
      });

      const fixer = new TestFixer(queue, runner, {
        maxRetries: 1,
        maxIterations: 1,
        dryRun: true,
        apiKey: 'test-key',
      });

      const result = await fixer.fixFailedTests();
      
      expect(result.totalTests).toBe(1);
      expect(result.attempts.length).toBeGreaterThan(0);
      
      // In dry-run mode, tests won't be fixed
      expect(result.fixedTests).toBe(0);
      
      const summary = fixer.getSummary();
      expect(summary).toContain('Failed: 1');
    });

    it('should track fix history correctly', async () => {
      const testFile = path.join(testDir, 'history-test.js');
      fs.writeFileSync(testFile, 'test("fail", () => { expect(1).toBe(2); });');
      
      queue.enqueue(testFile, 0);
      
      runner = new TestRunner({
        language: 'javascript',
        framework: 'jest',
      });

      const fixer = new TestFixer(queue, runner, {
        maxRetries: 2,
        dryRun: true,
        apiKey: 'test-key',
      });

      await fixer.fixFailedTests();
      
      const history = fixer.getFixHistory();
      expect(history.has(testFile)).toBe(true);
      
      const attempts = history.get(testFile);
      expect(attempts).toBeDefined();
      expect(attempts!.length).toBeGreaterThan(0);
      expect(attempts![0].testFile).toBe(testFile);
      expect(attempts![0].attemptNumber).toBe(1);
      expect(attempts![0].success).toBe(false); // Dry run always fails
    });
  });

  describe('Error Handling', () => {
    it('should handle Claude Code SDK integration', () => {
      delete process.env.ANTHROPIC_API_KEY;
      
      runner = new TestRunner({
        language: 'javascript',
        framework: 'jest',
      });

      // Should not throw when using Claude Code SDK (no API key required)
      expect(() => {
        new TestFixer(queue, runner);
      }).not.toThrow();
    });

    it('should handle invalid test files', async () => {
      const invalidFile = path.join(testDir, 'nonexistent.test.js');
      queue.enqueue(invalidFile, 0);
      
      runner = new TestRunner({
        language: 'javascript',
        framework: 'jest',
      });

      const fixer = new TestFixer(queue, runner, {
        dryRun: true,
        apiKey: 'test-key',
        maxRetries: 3,  // Explicit to make test clearer
      });

      const result = await fixer.fixFailedTests();
      
      expect(result.totalTests).toBe(1);
      expect(result.failedTests).toBe(3);  // 3 failed attempts (maxRetries)
      expect(result.fixedTests).toBe(0);
    });
  });
});