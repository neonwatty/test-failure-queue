import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { TestFixer, TestFixerConfig } from '../../src/integrations/claude/test-fixer.js';
import { TestFailureQueue } from '../../src/core/queue.js';
import { TestRunner } from '../../src/core/test-runner.js';
import { ClaudeCodeClient } from '../../src/integrations/claude/claude-code-client.js';
import fs from 'fs';
import path from 'path';

vi.mock('../../src/integrations/claude/claude-code-client.js');
vi.mock('fs');
vi.mock('chalk', () => ({
  default: {
    blue: vi.fn((str: string) => str),
    green: vi.fn((str: string) => str),
    yellow: vi.fn((str: string) => str),
    red: vi.fn((str: string) => str),
    gray: vi.fn((str: string) => str),
    bold: vi.fn((str: string) => str),
  },
  blue: vi.fn((str: string) => str),
  green: vi.fn((str: string) => str),
  yellow: vi.fn((str: string) => str),
  red: vi.fn((str: string) => str),
  gray: vi.fn((str: string) => str),
  bold: vi.fn((str: string) => str),
}));

describe('TestFixer', () => {
  let queue: TestFailureQueue;
  let runner: TestRunner;
  let fixer: TestFixer;
  let mockClaudeClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    queue = {
      size: vi.fn().mockReturnValue(0),
      list: vi.fn().mockReturnValue([]),
      dequeue: vi.fn(),
      enqueue: vi.fn(),
    } as any;

    runner = {
      getLanguage: vi.fn().mockReturnValue('javascript'),
      getFramework: vi.fn().mockReturnValue('jest'),
      runTests: vi.fn().mockResolvedValue({
        success: true,
        totalFailures: 0,
        failingTests: [],
      }),
    } as any;

    mockClaudeClient = {
      requestFix: vi.fn(),
      parseResponse: vi.fn(),
      getTokenUsage: vi.fn().mockReturnValue({ input: 0, output: 0, total: 0 }),
      estimateCost: vi.fn().mockReturnValue({ input: 0, output: 0, total: 0 }),
    } as any;

    (ClaudeCodeClient as any).mockImplementation(() => mockClaudeClient);
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      const fixer = new TestFixer(queue, runner);
      expect(fixer).toBeDefined();
    });

    it('should throw error if API key is not provided', () => {
      delete process.env.ANTHROPIC_API_KEY;
      
      expect(() => new TestFixer(queue, runner)).toThrow(
        'API key is required. Set ANTHROPIC_API_KEY environment variable or pass apiKey in config.'
      );
    });

    it('should accept custom configuration', () => {
      const config: TestFixerConfig = {
        maxRetries: 5,
        maxIterations: 20,
        systemPrompt: 'Custom prompt',
        apiKey: 'custom-key',
        verbose: true,
        dryRun: true,
      };
      
      const fixer = new TestFixer(queue, runner, config);
      expect(fixer).toBeDefined();
    });

    it('should use custom system prompt when provided', () => {
      const customPrompt = 'This is a custom system prompt for test fixing';
      const config: TestFixerConfig = {
        systemPrompt: customPrompt,
        apiKey: 'test-key',
      };
      
      const fixer = new TestFixer(queue, runner, config);
      expect((fixer as any).config.systemPrompt).toBe(customPrompt);
    });

    it('should use default system prompt when not provided', () => {
      const config: TestFixerConfig = {
        apiKey: 'test-key',
      };
      
      const fixer = new TestFixer(queue, runner, config);
      const defaultPrompt = (fixer as any).config.systemPrompt;
      expect(defaultPrompt).toContain('test fixing assistant');
      expect(defaultPrompt).toContain('analyze failing tests');
    });
  });

  describe('fixFailedTests', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      fixer = new TestFixer(queue, runner);
    });

    it('should return early if queue is empty', async () => {
      (queue.size as any).mockReturnValue(0);
      
      const result = await fixer.fixFailedTests();
      
      expect(result.totalTests).toBe(0);
      expect(result.fixedTests).toBe(0);
      expect(result.failedTests).toBe(0);
    });

    it('should process queue items', async () => {
      (queue.size as any).mockReturnValue(2);
      (queue.list as any).mockReturnValue([
        {
          id: 1,
          filePath: '/test/file1.test.js',
          priority: 1,
          createdAt: new Date(),
          failureCount: 1,
          lastFailure: new Date(),
        },
        {
          id: 2,
          filePath: '/test/file2.test.js',
          priority: 0,
          createdAt: new Date(),
          failureCount: 1,
          lastFailure: new Date(),
        },
      ]);

      (fs.readFileSync as any).mockReturnValue('test content');
      (fs.existsSync as any).mockReturnValue(false);
      
      mockClaudeClient.requestFix.mockResolvedValue({
        success: true,
        changes: [{
          file: '/test/file1.js',
          originalContent: 'original',
          newContent: 'fixed',
        }],
      });
      
      mockClaudeClient.parseResponse.mockReturnValue([{
        file: '/test/file1.js',
        originalContent: 'original',
        newContent: 'fixed',
      }]);

      (runner.runTests as any).mockResolvedValue({
        success: true,
        totalFailures: 0,
      });

      const result = await fixer.fixFailedTests();
      
      expect(result.totalTests).toBe(2);
      expect(result.fixedTests).toBeGreaterThan(0);
    });

    it('should respect max iterations', async () => {
      const config: TestFixerConfig = {
        maxIterations: 2,
        apiKey: 'test-key',
      };
      
      fixer = new TestFixer(queue, runner, config);
      
      (queue.size as any).mockReturnValue(10);
      (queue.list as any).mockReturnValue(
        Array(10).fill(null).map((_, i) => ({
          id: i,
          filePath: `/test/file${i}.test.js`,
          priority: 0,
          createdAt: new Date(),
          failureCount: 1,
          lastFailure: new Date(),
        }))
      );

      const result = await fixer.fixFailedTests();
      
      expect(result.totalTests).toBe(10);
    });
  });

  describe('processQueue', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      fixer = new TestFixer(queue, runner);
    });

    it('should skip items that reached max retries', async () => {
      const items = [{
        id: 1,
        filePath: '/test/file.test.js',
        priority: 0,
        createdAt: new Date(),
        failureCount: 5,
        lastFailure: new Date(),
      }];
      
      (queue.list as any).mockReturnValue(items);
      
      // Mark as already attempted max times
      const history = fixer.getFixHistory();
      history.set('/test/file.test.js', [
        { testFile: '/test/file.test.js', attemptNumber: 1, success: false, timeElapsed: 100 },
        { testFile: '/test/file.test.js', attemptNumber: 2, success: false, timeElapsed: 100 },
        { testFile: '/test/file.test.js', attemptNumber: 3, success: false, timeElapsed: 100 },
      ]);
      
      const result = await fixer.processQueue();
      
      expect(result.processed).toBe(0);
      expect(result.remaining).toBe(1);
    });

    it('should dequeue successful fixes', async () => {
      const items = [{
        id: 1,
        filePath: '/test/file.test.js',
        priority: 0,
        createdAt: new Date(),
        failureCount: 1,
        lastFailure: new Date(),
      }];
      
      (queue.list as any).mockReturnValue(items);
      (fs.readFileSync as any).mockReturnValue('test content');
      (fs.existsSync as any).mockReturnValue(false);
      
      mockClaudeClient.requestFix.mockResolvedValue({
        success: true,
        changes: [{
          file: '/test/file.js',
          originalContent: 'original',
          newContent: 'fixed',
        }],
      });
      
      mockClaudeClient.parseResponse.mockReturnValue([{
        file: '/test/file.js',
        originalContent: 'original',
        newContent: 'fixed',
      }]);

      (runner.runTests as any).mockResolvedValue({
        success: true,
        totalFailures: 0,
      });

      const result = await fixer.processQueue();
      
      expect(result.processed).toBe(1);
      expect(result.fixed).toBe(1);
      expect(queue.dequeue).toHaveBeenCalled();
    });
  });

  describe('attemptFix', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      fixer = new TestFixer(queue, runner);
    });

    it('should handle dry run mode', async () => {
      const config: TestFixerConfig = {
        dryRun: true,
        apiKey: 'test-key',
      };
      
      fixer = new TestFixer(queue, runner, config);
      
      const queueItem = {
        id: 1,
        filePath: '/test/file.test.js',
        priority: 0,
        createdAt: new Date(),
        failureCount: 1,
        lastFailure: new Date(),
        error: 'Test error',
      };
      
      (fs.readFileSync as any).mockReturnValue('test content');
      (fs.existsSync as any).mockReturnValue(false);
      
      const result = await fixer.attemptFix('/test/file.test.js', queueItem);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Dry run mode');
      expect(mockClaudeClient.requestFix).not.toHaveBeenCalled();
    });

    it('should revert changes if tests still fail', async () => {
      const queueItem = {
        id: 1,
        filePath: '/test/file.test.js',
        priority: 0,
        createdAt: new Date(),
        failureCount: 1,
        lastFailure: new Date(),
      };
      
      (fs.readFileSync as any).mockReturnValue('test content');
      (fs.existsSync as any).mockReturnValue(false);
      (fs.writeFileSync as any).mockImplementation(() => {});
      
      const changes = [{
        file: '/test/file.js',
        originalContent: 'original',
        newContent: 'fixed',
      }];
      
      mockClaudeClient.requestFix.mockResolvedValue({
        success: true,
        changes,
      });
      
      mockClaudeClient.parseResponse.mockReturnValue(changes);

      (runner.runTests as any).mockResolvedValue({
        success: false,
        totalFailures: 1,
      });

      const result = await fixer.attemptFix('/test/file.test.js', queueItem);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Tests still failing after fix');
      
      // Check that revert was called
      expect(fs.writeFileSync).toHaveBeenCalledWith('/test/file.js', 'original', 'utf-8');
    });

    it('should handle errors during fix attempt', async () => {
      const queueItem = {
        id: 1,
        filePath: '/test/file.test.js',
        priority: 0,
        createdAt: new Date(),
        failureCount: 1,
        lastFailure: new Date(),
      };
      
      (fs.readFileSync as any).mockImplementation(() => {
        throw new Error('File read error');
      });
      
      const result = await fixer.attemptFix('/test/file.test.js', queueItem);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('File read error');
    });
  });

  describe('generateFixPrompt', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      fixer = new TestFixer(queue, runner);
    });

    it('should include custom system prompt in generated prompt', async () => {
      const customPrompt = 'Special instructions for AI';
      const config: TestFixerConfig = {
        systemPrompt: customPrompt,
        apiKey: 'test-key',
      };
      
      fixer = new TestFixer(queue, runner, config);
      
      const queueItem = {
        id: 1,
        filePath: '/test/example.test.js',
        priority: 0,
        createdAt: new Date(),
        failureCount: 1,
        lastFailure: new Date(),
        error: 'Test failed',
      };
      
      (fs.readFileSync as any).mockReturnValue('test content');
      (fs.existsSync as any).mockReturnValue(false);
      
      const prompt = await fixer.generateFixPrompt('/test/example.test.js', queueItem);
      
      expect(prompt.systemPrompt).toBe(customPrompt);
    });

    it('should generate prompt with test and related files', async () => {
      const queueItem = {
        id: 1,
        filePath: '/test/calculator.test.js',
        priority: 0,
        createdAt: new Date(),
        failureCount: 1,
        lastFailure: new Date(),
        error: 'TypeError: add is not a function',
      };
      
      (fs.readFileSync as any)
        .mockReturnValueOnce('test("add should work", () => { expect(add(1, 2)).toBe(3); })')
        .mockReturnValueOnce('export function add(a, b) { return a - b; }');
      
      (fs.existsSync as any)
        .mockReturnValueOnce(false)  // calculator.js doesn't exist in test dir
        .mockReturnValueOnce(true);  // calculator.js exists in parent dir
      
      const prompt = await fixer.generateFixPrompt('/test/calculator.test.js', queueItem);
      
      expect(prompt.testFile).toBe('/test/calculator.test.js');
      expect(prompt.testContent).toContain('add should work');
      expect(prompt.errorOutput).toBe('TypeError: add is not a function');
      expect(prompt.relatedFiles).toHaveLength(1);
      expect(prompt.relatedFiles[0].content).toContain('export function add');
      expect(prompt.language).toBe('javascript');
      expect(prompt.framework).toBe('jest');
    });
  });

  describe('getSummary', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      fixer = new TestFixer(queue, runner);
    });

    it('should provide a summary of fix attempts', () => {
      const history = fixer.getFixHistory();
      history.set('/test/file1.js', [
        { testFile: '/test/file1.js', attemptNumber: 1, success: true, timeElapsed: 1000 },
      ]);
      history.set('/test/file2.js', [
        { testFile: '/test/file2.js', attemptNumber: 1, success: false, timeElapsed: 2000 },
        { testFile: '/test/file2.js', attemptNumber: 2, success: false, timeElapsed: 1500 },
      ]);
      
      const summary = fixer.getSummary();
      
      expect(summary).toContain('Fixed: 1');
      expect(summary).toContain('Failed: 2');
      expect(summary).toContain('Total time: 4.50s');
      expect(summary).toContain('Total attempts: 3');
    });
  });
});