import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { ClaudeCodeClient } from '../../src/providers/claude/claude-code-client.js';
import { FixPrompt } from '../../src/providers/claude/test-fixer.js';
import * as claudeCode from '@anthropic-ai/claude-code';

vi.mock('@anthropic-ai/claude-code');

describe('ClaudeCodeClient (SDK)', () => {
  let client: ClaudeCodeClient;
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockQuery = claudeCode.query as any;
    client = new ClaudeCodeClient({ useClaudeCodeSDK: true });
  });

  afterEach(() => {
    // Clean up
  });

  describe('constructor', () => {
    it('should initialize with Claude Code SDK enabled by default', () => {
      const testClient = new ClaudeCodeClient();
      // Client should be created successfully without API key
      expect(testClient).toBeDefined();
    });

    it('should accept useClaudeCodeSDK option', () => {
      const testClient = new ClaudeCodeClient({ useClaudeCodeSDK: true });
      expect(testClient).toBeDefined();
    });
  });

  describe('requestFix', () => {
    const testPrompt: FixPrompt = {
      testFile: '/test/calculator.test.js',
      testContent: 'test("add", () => { expect(add(1, 2)).toBe(3); })',
      errorOutput: 'TypeError: add is not a function',
      relatedFiles: [{
        path: '/src/calculator.js',
        content: 'export function add(a, b) { return a - b; }',
      }],
      language: 'javascript',
      framework: 'jest',
    };

    it('should successfully request a fix using Claude Code SDK', async () => {
      const mockMessages = [
        {
          type: 'result',
          subtype: 'success',
          result: JSON.stringify({
            success: true,
            explanation: 'Fixed the add function',
            changes: [{
              file: '/src/calculator.js',
              originalContent: 'export function add(a, b) { return a - b; }',
              newContent: 'export function add(a, b) { return a + b; }',
            }],
          }),
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
          duration_ms: 1000,
          duration_api_ms: 800,
          is_error: false,
          num_turns: 1,
          session_id: 'test-session',
          total_cost_usd: 0.001,
          permission_denials: [],
        },
      ];

      // Create an async generator mock
      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message as any;
        }
      } as any);

      const result = await client.requestFix(testPrompt);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].newContent).toContain('return a + b');
      expect(mockQuery).toHaveBeenCalledWith({
        prompt: expect.stringContaining('javascript'),
        options: {
          customSystemPrompt: expect.any(String),
          maxTurns: 1,
        },
      });
    });

    it('should handle JSON in code blocks', async () => {
      const mockMessages = [
        {
          type: 'result',
          subtype: 'success',
          result: '```json\n' + JSON.stringify({
            success: true,
            changes: [{
              file: '/src/calculator.js',
              newContent: 'fixed code',
            }],
          }) + '\n```',
          usage: { input_tokens: 0, output_tokens: 0 },
          duration_ms: 1000,
          duration_api_ms: 800,
          is_error: false,
          num_turns: 1,
          session_id: 'test-session',
          total_cost_usd: 0,
          permission_denials: [],
        },
      ];

      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message as any;
        }
      } as any);

      const result = await client.requestFix(testPrompt);

      expect(result.success).toBe(true);
      expect(result.changes).toHaveLength(1);
    });

    it('should handle errors from Claude Code SDK', async () => {
      mockQuery.mockImplementation(async function* () {
        throw new Error('SDK Error');
      } as any);

      const result = await client.requestFix(testPrompt);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get fix from Claude');
      expect(result.changes).toEqual([]);
    });

    it('should extract code blocks when JSON parsing fails', async () => {
      const mockMessages = [
        {
          type: 'result',
          subtype: 'success',
          result: `
Here's the fix:

\`\`\`javascript
// /src/calculator.js
export function add(a, b) { return a + b; }
\`\`\`

This should fix the test.
          `,
          usage: { input_tokens: 0, output_tokens: 0 },
          duration_ms: 1000,
          duration_api_ms: 800,
          is_error: false,
          num_turns: 1,
          session_id: 'test-session',
          total_cost_usd: 0,
          permission_denials: [],
        },
      ];

      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message as any;
        }
      } as any);

      const result = await client.requestFix(testPrompt);

      // Since we can't determine the exact file, it should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse response');
    });

    it('should track token usage across requests', async () => {
      const mockMessages = [
        {
          type: 'result',
          subtype: 'success',
          result: JSON.stringify({ success: true, changes: [] }),
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
          duration_ms: 1000,
          duration_api_ms: 800,
          is_error: false,
          num_turns: 1,
          session_id: 'test-session',
          total_cost_usd: 0.001,
          permission_denials: [],
        },
      ];

      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message as any;
        }
      } as any);

      const prompt: FixPrompt = {
        testFile: '/test.js',
        testContent: 'test',
        errorOutput: 'error',
        relatedFiles: [],
        language: 'javascript',
        framework: 'jest',
      };

      await client.requestFix(prompt);
      await client.requestFix(prompt);

      const usage = client.getTokenUsage();

      expect(usage.input).toBe(200);
      expect(usage.output).toBe(100);
      expect(usage.total).toBe(300);
    });
  });

  describe('parseResponse', () => {
    it('should parse a successful response', () => {
      const response = {
        success: true,
        changes: [{
          file: '/test.js',
          originalContent: 'old',
          newContent: 'new',
        }],
      };

      const changes = client.parseResponse(response);

      expect(changes).toHaveLength(1);
      expect(changes[0].file).toBe('/test.js');
      expect(changes[0].newContent).toBe('new');
    });

    it('should return empty array for failed response', () => {
      const response = {
        success: false,
        changes: [],
      };

      const changes = client.parseResponse(response);

      expect(changes).toEqual([]);
    });
  });

  describe('getTokenUsage', () => {
    it('should reset token usage', async () => {
      const mockMessages = [
        {
          type: 'result',
          subtype: 'success',
          result: JSON.stringify({ success: true, changes: [] }),
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
          duration_ms: 1000,
          duration_api_ms: 800,
          is_error: false,
          num_turns: 1,
          session_id: 'test-session',
          total_cost_usd: 0.001,
          permission_denials: [],
        },
      ];

      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message as any;
        }
      } as any);

      const prompt: FixPrompt = {
        testFile: '/test.js',
        testContent: 'test',
        errorOutput: 'error',
        relatedFiles: [],
        language: 'javascript',
        framework: 'jest',
      };

      await client.requestFix(prompt);
      
      client.resetTokenUsage();
      
      const usage = client.getTokenUsage();
      expect(usage.input).toBe(0);
      expect(usage.output).toBe(0);
      expect(usage.total).toBe(0);
    });
  });

  describe('estimateCost', () => {
    it('should estimate API costs correctly', async () => {
      const mockMessages = [
        {
          type: 'result',
          subtype: 'success',
          result: JSON.stringify({ success: true, changes: [] }),
          usage: {
            input_tokens: 1_000_000,
            output_tokens: 1_000_000,
          },
          duration_ms: 1000,
          duration_api_ms: 800,
          is_error: false,
          num_turns: 1,
          session_id: 'test-session',
          total_cost_usd: 18.00,
          permission_denials: [],
        },
      ];

      mockQuery.mockImplementation(async function* () {
        for (const message of mockMessages) {
          yield message as any;
        }
      } as any);

      const prompt: FixPrompt = {
        testFile: '/test.js',
        testContent: 'test',
        errorOutput: 'error',
        relatedFiles: [],
        language: 'javascript',
        framework: 'jest',
      };

      await client.requestFix(prompt);

      const cost = client.estimateCost();

      expect(cost.input).toBe(3.00);  // $3 per 1M input tokens
      expect(cost.output).toBe(15.00); // $15 per 1M output tokens
      expect(cost.total).toBe(18.00);
    });
  });
});