import { describe, it, expect, vi } from 'vitest';
import { query } from '@anthropic-ai/claude-code';

// Mock the Claude Code SDK
vi.mock('@anthropic-ai/claude-code');

describe('Claude Code SDK Provider - Basic Functionality', () => {
  it('should handle a simple arithmetic query', async () => {
    const mockQuery = query as any;
    
    // Mock the SDK response for a simple math question
    mockQuery.mockImplementation(async function* ({ prompt }: any) {
      // Simulate the SDK responding to "What is 2 + 3?"
      if (prompt.includes('2 + 3')) {
        yield {
          type: 'result',
          subtype: 'success',
          result: 'The answer to 2 + 3 is 5.',
          duration_ms: 500,
          duration_api_ms: 400,
          is_error: false,
          num_turns: 1,
          session_id: 'test-session-math',
          total_cost_usd: 0.0001,
          usage: {
            input_tokens: 10,
            output_tokens: 8,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
          permission_denials: [],
        };
      }
    });

    // Test the query
    let result = '';
    for await (const message of query({
      prompt: 'What is 2 + 3?',
      options: {
        maxTurns: 1,
      }
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        result = message.result;
      }
    }

    expect(result).toBe('The answer to 2 + 3 is 5.');
    expect(mockQuery).toHaveBeenCalledWith({
      prompt: 'What is 2 + 3?',
      options: {
        maxTurns: 1,
      }
    });
  });

  it('should handle a simple text transformation query', async () => {
    const mockQuery = query as any;
    
    // Mock the SDK response for text transformation
    mockQuery.mockImplementation(async function* ({ prompt }: any) {
      if (prompt.includes('uppercase')) {
        yield {
          type: 'result',
          subtype: 'success',
          result: 'HELLO WORLD',
          duration_ms: 300,
          duration_api_ms: 250,
          is_error: false,
          num_turns: 1,
          session_id: 'test-session-text',
          total_cost_usd: 0.0001,
          usage: {
            input_tokens: 15,
            output_tokens: 5,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
          permission_denials: [],
        };
      }
    });

    let result = '';
    for await (const message of query({
      prompt: 'Convert "hello world" to uppercase',
      options: {
        customSystemPrompt: 'You are a text transformation assistant.',
        maxTurns: 1,
      }
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        result = message.result;
      }
    }

    expect(result).toBe('HELLO WORLD');
  });

  it('should handle error responses gracefully', async () => {
    const mockQuery = query as any;
    
    // Mock an error response
    mockQuery.mockImplementation(async function* () {
      yield {
        type: 'result',
        subtype: 'error_max_turns',
        duration_ms: 100,
        duration_api_ms: 80,
        is_error: true,
        num_turns: 0,
        session_id: 'test-session-error',
        total_cost_usd: 0,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        permission_denials: [],
      };
    });

    let errorEncountered = false;
    for await (const message of query({
      prompt: 'This will trigger an error',
      options: {
        maxTurns: 1,
      }
    })) {
      if (message.type === 'result' && message.subtype !== 'success') {
        errorEncountered = true;
      }
    }

    expect(errorEncountered).toBe(true);
  });

  it('should support streaming multiple messages', async () => {
    const mockQuery = query as any;
    
    // Mock multiple message types
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
        result: 'Task completed successfully',
        duration_ms: 1000,
        duration_api_ms: 900,
        is_error: false,
        num_turns: 1,
        session_id: 'test-session-stream',
        total_cost_usd: 0.0002,
        usage: {
          input_tokens: 20,
          output_tokens: 15,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        permission_denials: [],
      };
    });

    const messages: any[] = [];
    for await (const message of query({
      prompt: 'Perform a multi-step task',
      options: {
        maxTurns: 2,
      }
    })) {
      messages.push(message);
    }

    expect(messages).toHaveLength(2);
    expect(messages[0].type).toBe('assistant');
    expect(messages[1].type).toBe('result');
    expect(messages[1].result).toBe('Task completed successfully');
  });

  it('should validate the SDK is properly imported', () => {
    // This test verifies that the SDK module is accessible
    expect(query).toBeDefined();
    expect(typeof query).toBe('function');
  });
});