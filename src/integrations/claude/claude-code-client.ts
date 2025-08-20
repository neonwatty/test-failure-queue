import { FixPrompt, CodeChange, FixResponse } from './types.js';
import { query } from '@anthropic-ai/claude-code';
import fs from 'fs';
import path from 'path';

export type { FixResponse } from './types.js';

export class ClaudeCodeClient {
  private totalTokensUsed = { input: 0, output: 0 };
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    process.env.ANTHROPIC_API_KEY = apiKey;
  }

  async requestFix(prompt: FixPrompt): Promise<FixResponse> {
    const userPrompt = this.buildUserPrompt(prompt);
    const systemPrompt = prompt.systemPrompt || this.getDefaultSystemPrompt();

    try {
      let responseText = '';
      let tokenUsage = { input: 0, output: 0 };

      for await (const message of query({
        prompt: userPrompt,
        options: {
          customSystemPrompt: systemPrompt,
          maxTurns: 1,
          permissionMode: 'bypassPermissions',
          allowedTools: ['Read', 'Write', 'Edit']
        }
      })) {
        if (message.type === 'result' && message.subtype === 'success') {
          responseText = message.result;
          if (message.usage) {
            tokenUsage.input = message.usage.input_tokens || 0;
            tokenUsage.output = message.usage.output_tokens || 0;
          }
        }
      }

      this.totalTokensUsed.input += tokenUsage.input;
      this.totalTokensUsed.output += tokenUsage.output;

      return this.parseFixResponse(responseText, prompt);
    } catch (error) {
      return {
        success: false,
        changes: [],
        error: `Failed to get fix from Claude: ${error}`,
      };
    }
  }

  parseResponse(response: FixResponse): CodeChange[] {
    return response.changes || [];
  }

  private buildUserPrompt(prompt: FixPrompt): string {
    let userPrompt = `
Language: ${prompt.language}
Framework: ${prompt.framework}

FAILING TEST FILE (${prompt.testFile}):
\`\`\`
${prompt.testContent}
\`\`\`

ERROR OUTPUT:
\`\`\`
${prompt.errorOutput}
\`\`\`
`;

    if (prompt.relatedFiles.length > 0) {
      userPrompt += '\nRELATED SOURCE FILES:\n';
      for (const file of prompt.relatedFiles) {
        userPrompt += `\n${file.path}:\n\`\`\`\n${file.content}\n\`\`\`\n`;
      }
    }

    userPrompt += `
Please analyze the failing test and fix the implementation code to make the test pass.

Return your response in the following JSON format:
{
  "success": true,
  "explanation": "Brief explanation of what was wrong and how you fixed it",
  "changes": [
    {
      "file": "path/to/file.js",
      "originalContent": "full original file content",
      "newContent": "full new file content with fixes applied"
    }
  ]
}

Important:
1. Include the COMPLETE file content in both originalContent and newContent
2. Only modify files that need changes to fix the test
3. Ensure all syntax is correct
4. Preserve the original formatting and style
`;

    return userPrompt;
  }

  private parseFixResponse(responseText: string, prompt: FixPrompt): FixResponse {
    try {
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        const plainJsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!plainJsonMatch) {
          throw new Error('No JSON found in response');
        }
        responseText = plainJsonMatch[0];
      } else {
        responseText = jsonMatch[1];
      }

      const parsed = JSON.parse(responseText);
      
      if (!parsed.changes || !Array.isArray(parsed.changes)) {
        throw new Error('Invalid response format: missing changes array');
      }

      for (const change of parsed.changes) {
        if (!change.file || !change.newContent) {
          throw new Error('Invalid change format: missing required fields');
        }

        const fullPath = path.isAbsolute(change.file) 
          ? change.file 
          : path.join(process.cwd(), change.file);

        if (!change.originalContent && fs.existsSync(fullPath)) {
          change.originalContent = fs.readFileSync(fullPath, 'utf-8');
        }

        change.file = fullPath;
      }

      return {
        success: parsed.success ?? true,
        changes: parsed.changes,
        explanation: parsed.explanation,
      };
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      
      const codeBlocks = this.extractCodeBlocks(responseText);
      if (codeBlocks.length > 0) {
        const changes: CodeChange[] = [];
        
        for (const block of codeBlocks) {
          if (block.file && prompt.relatedFiles.length > 0) {
            const targetFile = prompt.relatedFiles.find(f => 
              f.path.includes(block.file!) || 
              path.basename(f.path) === block.file
            );
            
            if (targetFile) {
              changes.push({
                file: targetFile.path,
                originalContent: targetFile.content,
                newContent: block.content,
              });
            }
          }
        }

        if (changes.length > 0) {
          return {
            success: true,
            changes,
            explanation: 'Extracted code changes from response',
          };
        }
      }

      return {
        success: false,
        changes: [],
        error: `Failed to parse response: ${error}`,
      };
    }
  }

  private extractCodeBlocks(text: string): { file?: string; content: string; language?: string }[] {
    const blocks: { file?: string; content: string; language?: string }[] = [];
    const codeBlockRegex = /```(\w+)?\s*(?:\/\/\s*(.+?)\n)?([\s\S]*?)```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1],
        file: match[2],
        content: match[3].trim(),
      });
    }
    
    return blocks;
  }

  private getDefaultSystemPrompt(): string {
    return `You are Claude, an AI assistant specialized in fixing failing tests by modifying implementation code.

Your task is to:
1. Analyze the failing test to understand what it expects
2. Identify why the current implementation fails
3. Fix the implementation code to make the test pass
4. Ensure your fix is minimal and doesn't break other functionality

Guidelines:
- Only fix the implementation, not the test itself (unless the test has obvious errors)
- Preserve existing code style and conventions
- Add necessary imports if missing
- Fix syntax errors and type errors
- Make the minimal changes necessary
- Ensure the code remains clean and maintainable

Always respond with valid JSON containing the file changes needed to fix the test.`;
  }

  public getTokenUsage(): { input: number; output: number; total: number } {
    return {
      input: this.totalTokensUsed.input,
      output: this.totalTokensUsed.output,
      total: this.totalTokensUsed.input + this.totalTokensUsed.output,
    };
  }

  public estimateCost(): { input: number; output: number; total: number } {
    const inputCostPer1M = 3.00;
    const outputCostPer1M = 15.00;
    
    const inputCost = (this.totalTokensUsed.input / 1_000_000) * inputCostPer1M;
    const outputCost = (this.totalTokensUsed.output / 1_000_000) * outputCostPer1M;
    
    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
    };
  }

  public resetTokenUsage(): void {
    this.totalTokensUsed = { input: 0, output: 0 };
  }
}