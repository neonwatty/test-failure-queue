import { describe, it, expect, vi } from 'vitest';
import { query } from '@anthropic-ai/claude-code';

// Mock the Claude Code SDK
vi.mock('@anthropic-ai/claude-code');

describe('Claude Code SDK Provider - Integration Example', () => {
  it('should work with a simple math assistant (similar to legal-agent.ts pattern)', async () => {
    const mockQuery = query as any;
    
    // Mock the SDK to simulate a math assistant
    mockQuery.mockImplementation(async function* ({ prompt, options }: any) {
      // Check that the system prompt is set correctly
      if (options?.customSystemPrompt?.includes('math assistant')) {
        yield {
          type: 'result',
          subtype: 'success',
          result: '2 + 3 = 5\n\nHere\'s the breakdown:\n- Start with 2\n- Add 3\n- Result is 5\n\nThis is a basic addition operation.',
          duration_ms: 600,
          duration_api_ms: 500,
          is_error: false,
          num_turns: 1,
          session_id: 'test-math-assistant',
          total_cost_usd: 0.0001,
          usage: {
            input_tokens: 25,
            output_tokens: 30,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
          permission_denials: [],
        };
      }
    });

    // Create a simple math assistant (following the legal-agent.ts pattern)
    let assistantResponse = '';
    
    for await (const message of query({
      prompt: 'Calculate and explain: What is 2 + 3?',
      options: {
        customSystemPrompt: 'You are a helpful math assistant. Explain calculations step by step.',
        maxTurns: 1
      }
    })) {
      if (message.type === 'result') {
        assistantResponse = message.result;
      }
    }

    // Verify the response
    expect(assistantResponse).toContain('2 + 3 = 5');
    expect(assistantResponse).toContain('breakdown');
    expect(mockQuery).toHaveBeenCalledWith({
      prompt: 'Calculate and explain: What is 2 + 3?',
      options: {
        customSystemPrompt: 'You are a helpful math assistant. Explain calculations step by step.',
        maxTurns: 1
      }
    });
  });

  it('should work with a code review assistant', async () => {
    const mockQuery = query as any;
    
    mockQuery.mockImplementation(async function* ({ prompt, options }: any) {
      if (prompt.includes('review this code')) {
        yield {
          type: 'result',
          subtype: 'success',
          result: 'Code Review:\n\n✅ Good: The function correctly adds two numbers\n⚠️ Suggestion: Consider adding input validation\n📝 Example: Check if inputs are numbers before adding',
          duration_ms: 800,
          duration_api_ms: 700,
          is_error: false,
          num_turns: 1,
          session_id: 'test-code-review',
          total_cost_usd: 0.0002,
          usage: {
            input_tokens: 40,
            output_tokens: 35,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
          permission_denials: [],
        };
      }
    });

    // Create a code review assistant
    let reviewResult = '';
    
    for await (const message of query({
      prompt: 'Please review this code: function add(a, b) { return a + b; }',
      options: {
        customSystemPrompt: 'You are a code review assistant. Provide constructive feedback.',
        maxTurns: 1
      }
    })) {
      if (message.type === 'result' && message.subtype === 'success') {
        reviewResult = message.result;
      }
    }

    expect(reviewResult).toContain('Code Review');
    expect(reviewResult).toContain('Good');
    expect(reviewResult).toContain('Suggestion');
  });

  it('should handle multi-turn conversations', async () => {
    const mockQuery = query as any;
    let turnCount = 0;
    
    mockQuery.mockImplementation(async function* ({ options }: any) {
      turnCount++;
      
      // Simulate a multi-turn conversation
      if (options?.maxTurns === 2) {
        // First turn: assistant asks for clarification
        yield {
          type: 'assistant',
          content: 'I need more information. What kind of calculation?',
        };
        
        // Second turn: provide the answer
        yield {
          type: 'result',
          subtype: 'success',
          result: 'Based on our conversation, the answer is 5.',
          duration_ms: 1200,
          duration_api_ms: 1000,
          is_error: false,
          num_turns: 2,
          session_id: 'test-multi-turn',
          total_cost_usd: 0.0003,
          usage: {
            input_tokens: 50,
            output_tokens: 40,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
          permission_denials: [],
        };
      }
    });

    const messages: any[] = [];
    
    for await (const message of query({
      prompt: 'Help me with a calculation',
      options: {
        customSystemPrompt: 'You are an interactive math tutor.',
        maxTurns: 2
      }
    })) {
      messages.push(message);
    }

    expect(messages).toHaveLength(2);
    expect(messages[0].type).toBe('assistant');
    expect(messages[1].type).toBe('result');
    expect(messages[1].num_turns).toBe(2);
  });
});