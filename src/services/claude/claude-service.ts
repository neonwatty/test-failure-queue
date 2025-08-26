import { execa } from 'execa';
import chalk from 'chalk';
import fs from 'fs';
import { ClaudeConfig, ClaudeFixResult, ClaudeValidationResult } from './types.js';
import { ClaudeConfigManager } from './config.js';
import { ConfigManager } from '../../core/config.js';

export class ClaudeService {
  private config: ClaudeConfig;
  private claudePath: string | null = null;
  private claudeConfigManager: ClaudeConfigManager;

  constructor(configPath?: string, overrideClaudePath?: string) {
    // Get base config from ConfigManager
    const configManager = ConfigManager.getInstance(configPath);
    const baseConfig = configManager.getConfig();
    
    // Initialize Claude config manager with config from base
    this.claudeConfigManager = new ClaudeConfigManager(baseConfig.claude);
    this.config = this.claudeConfigManager.getClaudeConfig();
    
    this.claudePath = this.claudeConfigManager.getClaudePath(overrideClaudePath);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }
    
    if (!this.claudePath) {
      return false;
    }
    
    try {
      // Quick test to see if Claude responds
      const result = await execa(this.claudePath, ['--version'], {
        timeout: 5000, // 5 second timeout for version check
        reject: false
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  validateConfiguration(): ClaudeValidationResult {
    if (!this.config.enabled) {
      return {
        isValid: false,
        error: 'Claude integration is disabled in configuration'
      };
    }
    
    if (!this.claudePath) {
      return {
        isValid: false,
        error: 'Claude path not found. Please check your configuration or install Claude Code CLI.'
      };
    }
    
    return {
      isValid: true,
      claudePath: this.claudePath
    };
  }

  async fixTest(filePath: string, errorContext?: string): Promise<ClaudeFixResult> {
    const startTime = Date.now();
    
    // Validate configuration first
    const validation = this.validateConfiguration();
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
        duration: Date.now() - startTime
      };
    }
    
    // Prepare the prompt - read file content and include it directly instead of just the path
    let prompt = this.config.prompt || 'run the failed test file {filePath} and debug any errors you encounter one at a time';
    
    // Try to read the file content and include it in the prompt for better reliability
    let fileContent = '';
    try {
      fileContent = fs.readFileSync(filePath, 'utf8');
      prompt = `Fix the syntax and logic errors in this JavaScript test file and return only the corrected code:

\`\`\`javascript
${fileContent}
\`\`\`

Please provide only the corrected JavaScript code without any additional explanation or file writing.`;
    } catch (error) {
      // Fallback to original prompt with just file path
      prompt = prompt.replace('{filePath}', filePath);
    }
    
    if (errorContext) {
      prompt += `\n\nPrevious error context:\n${errorContext}`;
    }
    
    try {
      const timeout = this.config.testTimeout || 420000; // Default 7 minutes
      
      console.log('🔄 Starting Claude CLI with real-time streaming...');
      console.log('📝 Using prompt:', prompt.substring(0, 200) + '...');
      console.log('⏰ Timeout set to:', timeout, 'ms');
      
      // Use streaming approach to show real-time output
      // Pass prompt via stdin to avoid command line length/escaping issues
      const cliArgs = this.claudeConfigManager.buildCliArguments();
      const childProcess = execa(this.claudePath!, cliArgs, {
        timeout,
        env: process.env,
        buffer: false, // Don't buffer output
        input: prompt // Pass prompt via stdin instead of command line argument
      });

      let outputBuffer = '';
      let errorBuffer = '';
      let allOutput = '';

      // Stream stdout (contains the text output with verbose info)
      childProcess.stdout?.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        outputBuffer += data;
        allOutput += data;
        
        // Process complete lines for real-time display
        const lines = outputBuffer.split('\n');
        outputBuffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            console.log('📤 Claude:', line);
          }
        }
      });

      // Stream stderr (errors)
      childProcess.stderr?.on('data', (chunk: Buffer) => {
        const data = chunk.toString();
        errorBuffer += data;
        console.log('⚠️  Claude stderr:', data.trim());
      });

      console.log('⏳ Waiting for Claude process to complete...');
      const result = await childProcess;
      console.log('🏁 Claude process finished with exit code:', result.exitCode);
      
      // Process any remaining buffered output
      if (outputBuffer.trim()) {
        console.log('📤 Claude final output:', outputBuffer.trim());
      }
      
      console.log('✅ Claude CLI process completed');
      console.log(`📄 Total output length: ${allOutput.length} characters`);
      
      // Determine success/error and handle file writing
      let errorMessage: string | undefined;
      let success = result.exitCode === 0;
      
      if (success && allOutput && fileContent) {
        // Extract corrected code from Claude's response and write it back to the file
        try {
          const codeMatch = allOutput.match(/```javascript\s*([\s\S]*?)```/);
          if (codeMatch && codeMatch[1]) {
            const correctedCode = codeMatch[1].trim();
            fs.writeFileSync(filePath, correctedCode);
            console.log('📝 Successfully wrote corrected code back to file');
          } else {
            // If no code block found, try to extract meaningful content
            const cleanedOutput = allOutput.replace(/^[^a-zA-Z]*/, '').trim();
            if (cleanedOutput.includes('describe') || cleanedOutput.includes('it') || cleanedOutput.includes('expect')) {
              fs.writeFileSync(filePath, cleanedOutput);
              console.log('📝 Successfully wrote corrected code back to file (fallback extraction)');
            } else {
              console.log('⚠️  Could not extract corrected code from Claude response');
              errorMessage = 'Could not extract corrected code from response';
              success = false;
            }
          }
        } catch (writeError) {
          console.log('❌ Failed to write corrected code to file:', writeError);
          errorMessage = `Failed to write corrected code: ${writeError}`;
          success = false;
        }
      } else if (result.exitCode !== 0) {
        if (errorBuffer) {
          errorMessage = errorBuffer.trim();
        } else {
          errorMessage = 'Claude process failed';
        }
      }
      
      return {
        success,
        error: errorMessage,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      console.log('❌ Claude process threw an error:', error.message);
      console.log('🔍 Error details - timedOut:', error.timedOut, 'exitCode:', error.exitCode, 'duration:', error.durationMs);
      
      let errorMessage = 'Unknown error';
      
      if (error.timedOut) {
        errorMessage = `Claude timed out after ${this.config.testTimeout}ms`;
      } else if (error.exitCode !== undefined) {
        errorMessage = `Claude exited with code ${error.exitCode}`;
        if (error.stderr) {
          errorMessage += `: ${error.stderr}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime
      };
    }
  }

  getConfig(): ClaudeConfig {
    return { ...this.config };
  }

  getClaudePath(): string | null {
    return this.claudePath;
  }

  isEnabled(): boolean {
    return this.config.enabled === true;
  }

  getMaxIterations(): number {
    return this.config.maxIterations || 20;
  }

  getTestTimeout(): number {
    return this.config.testTimeout || 420000;
  }

  private logClaudeStreamingOutput(jsonData: any): void {
    switch (jsonData.type) {
      case 'system':
        if (jsonData.subtype === 'init') {
          console.log('🔧 Claude initialized with tools:', jsonData.tools?.slice(0, 5).join(', ') + (jsonData.tools?.length > 5 ? '...' : ''));
          console.log('🎯 Model:', jsonData.model);
          console.log('🔐 Permission mode:', jsonData.permissionMode);
        }
        break;
        
      case 'assistant':
        if (jsonData.message?.content) {
          const content = Array.isArray(jsonData.message.content) 
            ? jsonData.message.content.map((c: any) => c.text || c.type).join(' ')
            : jsonData.message.content;
          console.log('🤖 Claude response:', content.substring(0, 100) + (content.length > 100 ? '...' : ''));
        }
        break;
        
      case 'tool_use':
        console.log(`🔨 Using tool: ${jsonData.name}${jsonData.input?.command ? ' - ' + jsonData.input.command : ''}`);
        break;
        
      case 'tool_result':
        const resultPreview = typeof jsonData.content === 'string' 
          ? jsonData.content.substring(0, 80) + (jsonData.content.length > 80 ? '...' : '')
          : JSON.stringify(jsonData.content).substring(0, 80);
        console.log(`📋 Tool result: ${resultPreview}`);
        break;
        
      case 'result':
        if (jsonData.subtype === 'success') {
          console.log('✅ Claude completed successfully');
          console.log(`⏱️  Duration: ${jsonData.duration_ms}ms, API: ${jsonData.duration_api_ms}ms`);
          console.log(`💰 Cost: $${jsonData.total_cost_usd}`);
          if (jsonData.permission_denials?.length > 0) {
            console.log('⛔ Permission denials:', jsonData.permission_denials.length);
          }
        } else if (jsonData.is_error) {
          console.log('❌ Claude encountered an error:', jsonData.error);
        }
        break;
        
      case 'error':
        console.log('🚨 Claude error:', jsonData.error || jsonData.message);
        break;
        
      default:
        // Log other message types with limited detail
        console.log(`📡 Claude event: ${jsonData.type}${jsonData.subtype ? ':' + jsonData.subtype : ''}`);
    }
  }
}

// Singleton for easy access
let instance: ClaudeService | null = null;

export function getClaudeService(configPath?: string, overrideClaudePath?: string): ClaudeService {
  if (!instance || configPath || overrideClaudePath) {
    instance = new ClaudeService(configPath, overrideClaudePath);
  }
  return instance;
}