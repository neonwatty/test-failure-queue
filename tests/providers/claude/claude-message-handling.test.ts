import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeCodeClient } from '../../../src/providers/claude/claude-code-client.js';
import { FixPrompt } from '../../../src/providers/claude/types.js';
import * as claudeCode from '@anthropic-ai/claude-code';

vi.mock('@anthropic-ai/claude-code');

describe('Claude Code Client - Message Handling', () => {
  let client: ClaudeCodeClient;
  let mockQuery: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = claudeCode.query as any;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should handle assistant messages when verbose is true', async () => {
    client = new ClaudeCodeClient({ verbose: true });
    
    mockQuery.mockImplementation(async function* () {
      // First yield an assistant message
      yield {
        type: 'assistant',
        content: 'Processing your request...',
      };
      
      // Then yield the result
      yield {
        type: 'result',
        subtype: 'success',
        result: JSON.stringify({ success: true, changes: [] }),
        usage: { input_tokens: 10, output_tokens: 5 },
      };
    });

    const prompt: FixPrompt = {
      testFile: '/test.js',
      testContent: 'test content',
      errorOutput: 'error',
      relatedFiles: [],
      language: 'javascript',
      framework: 'jest',
    };

    const result = await client.requestFix(prompt);
    
    // Should log assistant message when verbose
    expect(consoleLogSpy).toHaveBeenCalledWith('Claude:', 'Processing your request...');
    expect(result.success).toBe(true);
  });

  it('should not log assistant messages when verbose is false', async () => {
    client = new ClaudeCodeClient({ verbose: false });
    
    mockQuery.mockImplementation(async function* () {
      yield {
        type: 'assistant',
        content: 'Processing your request...',
      };
      
      yield {
        type: 'result',
        subtype: 'success',
        result: JSON.stringify({ success: true, changes: [] }),
        usage: { input_tokens: 10, output_tokens: 5 },
      };
    });

    const prompt: FixPrompt = {
      testFile: '/test.js',
      testContent: 'test content',
      errorOutput: 'error',
      relatedFiles: [],
      language: 'javascript',
      framework: 'jest',
    };

    await client.requestFix(prompt);
    
    // Should not log when verbose is false
    expect(consoleLogSpy).not.toHaveBeenCalledWith('Claude:', 'Processing your request...');
  });

  it('should handle error subtypes gracefully', async () => {
    client = new ClaudeCodeClient();
    
    mockQuery.mockImplementation(async function* () {
      yield {
        type: 'result',
        subtype: 'error_max_turns',
        duration_ms: 100,
        duration_api_ms: 80,
        is_error: true,
        num_turns: 0,
        session_id: 'test-session',
        total_cost_usd: 0,
        usage: { input_tokens: 0, output_tokens: 0 },
        permission_denials: [],
      };
    });

    const prompt: FixPrompt = {
      testFile: '/test.js',
      testContent: 'test content',
      errorOutput: 'error',
      relatedFiles: [],
      language: 'javascript',
      framework: 'jest',
    };

    const result = await client.requestFix(prompt);
    
    // Should log error and return failure
    expect(consoleErrorSpy).toHaveBeenCalledWith('Claude Code SDK error: error_max_turns');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Query failed: error_max_turns');
  });

  it('should ignore unknown message types', async () => {
    client = new ClaudeCodeClient();
    
    mockQuery.mockImplementation(async function* () {
      // Yield various message types
      yield { type: 'user', content: 'User message' };
      yield { type: 'system', content: 'System message' };
      yield { type: 'unknown', content: 'Unknown message' };
      
      // Finally yield result
      yield {
        type: 'result',
        subtype: 'success',
        result: JSON.stringify({ success: true, changes: [] }),
        usage: { input_tokens: 10, output_tokens: 5 },
      };
    });

    const prompt: FixPrompt = {
      testFile: '/test.js',
      testContent: 'test content',
      errorOutput: 'error',
      relatedFiles: [],
      language: 'javascript',
      framework: 'jest',
    };

    const result = await client.requestFix(prompt);
    
    // Should only process the result message
    expect(result.success).toBe(true);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should handle mixed message stream correctly', async () => {
    client = new ClaudeCodeClient({ verbose: true });
    
    const messages: any[] = [];
    mockQuery.mockImplementation(async function* () {
      yield { type: 'assistant', content: 'Starting...' };
      yield { type: 'assistant', content: 'Working...' };
      yield {
        type: 'result',
        subtype: 'success',
        result: JSON.stringify({
          success: true,
          changes: [{
            file: '/src/test.js',
            newContent: 'fixed',
          }],
        }),
        usage: { input_tokens: 20, output_tokens: 10 },
      };
    });

    const prompt: FixPrompt = {
      testFile: '/test.js',
      testContent: 'test content',
      errorOutput: 'error',
      relatedFiles: [{
        path: '/src/test.js',
        content: 'broken',
      }],
      language: 'javascript',
      framework: 'jest',
    };

    const result = await client.requestFix(prompt);
    
    // Should log both assistant messages
    expect(consoleLogSpy).toHaveBeenCalledWith('Claude:', 'Starting...');
    expect(consoleLogSpy).toHaveBeenCalledWith('Claude:', 'Working...');
    
    // Should still process result correctly
    expect(result.success).toBe(true);
    expect(result.changes).toHaveLength(1);
  });
});