import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestFixer, TestFixerConfig } from '../../src/integrations/claude/test-fixer.js';
import { TestFailureQueue } from '../../src/core/queue.js';
import { TestRunner } from '../../src/core/test-runner.js';
import { ClaudeCodeClient } from '../../src/integrations/claude/claude-code-client.js';

vi.mock('../../src/integrations/claude/claude-code-client.js');

describe('System Prompt Configuration Precedence', () => {
  let queue: TestFailureQueue;
  let runner: TestRunner;

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

    (ClaudeCodeClient as any).mockImplementation(() => ({
      requestFix: vi.fn(),
      parseResponse: vi.fn(),
      getTokenUsage: vi.fn().mockReturnValue({ input: 0, output: 0, total: 0 }),
      estimateCost: vi.fn().mockReturnValue({ input: 0, output: 0, total: 0 }),
    }));
  });

  describe('System Prompt Precedence', () => {
    it('should prioritize explicit systemPrompt over default', () => {
      const explicitPrompt = 'Explicit prompt from config';
      const config: TestFixerConfig = {
        systemPrompt: explicitPrompt,
        apiKey: 'test-key',
      };
      
      const fixer = new TestFixer(queue, runner, config);
      expect((fixer as any).config.systemPrompt).toBe(explicitPrompt);
    });

    it('should use default prompt when systemPrompt is undefined', () => {
      const config: TestFixerConfig = {
        systemPrompt: undefined,
        apiKey: 'test-key',
      };
      
      const fixer = new TestFixer(queue, runner, config);
      const systemPrompt = (fixer as any).config.systemPrompt;
      
      // Should use the default prompt
      expect(systemPrompt).toContain('test fixing assistant');
      expect(systemPrompt).toContain('analyze failing tests');
      expect(systemPrompt).toContain('Rules:');
    });

    it('should use default prompt when no config is provided', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      const fixer = new TestFixer(queue, runner);
      const systemPrompt = (fixer as any).config.systemPrompt;
      
      // Should use the default prompt
      expect(systemPrompt).toContain('test fixing assistant');
      expect(systemPrompt).toContain('analyze failing tests');
    });

    it('should handle empty string as valid system prompt', () => {
      const config: TestFixerConfig = {
        systemPrompt: '',
        apiKey: 'test-key',
      };
      
      const fixer = new TestFixer(queue, runner, config);
      expect((fixer as any).config.systemPrompt).toBe('');
    });

    it('should handle multi-line system prompt', () => {
      const multiLinePrompt = `Line 1
Line 2
Line 3

Special instructions:
- Rule 1
- Rule 2`;
      
      const config: TestFixerConfig = {
        systemPrompt: multiLinePrompt,
        apiKey: 'test-key',
      };
      
      const fixer = new TestFixer(queue, runner, config);
      expect((fixer as any).config.systemPrompt).toBe(multiLinePrompt);
    });
  });

  describe('CLI and Config File Integration', () => {
    it('should simulate CLI flag taking precedence over config file', () => {
      // This simulates the behavior in cli.ts where:
      // systemPrompt: options.systemPrompt || config.fixTestsSystemPrompt
      
      const configFilePrompt = 'Prompt from config file';
      const cliPrompt = 'Prompt from CLI flag';
      
      // Simulate CLI logic
      const options = { systemPrompt: cliPrompt };
      const configFile = { fixTestsSystemPrompt: configFilePrompt };
      
      const finalPrompt = options.systemPrompt || configFile.fixTestsSystemPrompt;
      
      const config: TestFixerConfig = {
        systemPrompt: finalPrompt,
        apiKey: 'test-key',
      };
      
      const fixer = new TestFixer(queue, runner, config);
      expect((fixer as any).config.systemPrompt).toBe(cliPrompt);
    });

    it('should simulate using config file when CLI flag is not provided', () => {
      const configFilePrompt = 'Prompt from config file';
      
      // Simulate CLI logic with no systemPrompt option
      const options = { systemPrompt: undefined };
      const configFile = { fixTestsSystemPrompt: configFilePrompt };
      
      const finalPrompt = options.systemPrompt || configFile.fixTestsSystemPrompt;
      
      const config: TestFixerConfig = {
        systemPrompt: finalPrompt,
        apiKey: 'test-key',
      };
      
      const fixer = new TestFixer(queue, runner, config);
      expect((fixer as any).config.systemPrompt).toBe(configFilePrompt);
    });

    it('should simulate using default when neither CLI nor config provides prompt', () => {
      // Simulate CLI logic with no prompts anywhere
      const options = { systemPrompt: undefined };
      const configFile = { fixTestsSystemPrompt: undefined };
      
      const finalPrompt = options.systemPrompt || configFile.fixTestsSystemPrompt;
      
      const config: TestFixerConfig = {
        systemPrompt: finalPrompt, // This will be undefined
        apiKey: 'test-key',
      };
      
      const fixer = new TestFixer(queue, runner, config);
      const systemPrompt = (fixer as any).config.systemPrompt;
      
      // Should fall back to default
      expect(systemPrompt).toContain('test fixing assistant');
    });
  });
});