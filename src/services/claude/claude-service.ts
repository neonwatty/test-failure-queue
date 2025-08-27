import { execa } from 'execa';
import { ClaudeConfig, ClaudeFixResult, ClaudeValidationResult, ClaudeFixNextResult } from './types.js';
import { ClaudeConfigManager } from './config.js';
import { ConfigManager } from '../../core/config.js';
import { TestFailureQueue } from '../../core/queue.js';
import { TestRunner } from '../../core/test-runner.js';

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

  async fixTest(filePath: string, errorContext?: string, timeoutOverride?: number): Promise<ClaudeFixResult> {
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
    
    // Use the user's custom prompt if provided, otherwise use default
    let prompt = this.config.prompt || 'Run the test file at {testFilePath} and debug any errors you encounter one at a time. Then run the test again to verify that your changes have fixed any errors.';
    
    // Replace the {testFilePath} placeholder with the actual file path
    prompt = prompt.replace('{testFilePath}', filePath);
    
    if (errorContext) {
      prompt += `\n\nPrevious error context:\n${errorContext}`;
    }
    
    try {
      const timeout = timeoutOverride || this.config.testTimeout || 420000; // Use override or default 7 minutes
      
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
      
      // Determine success/error based on Claude Code exit status
      let errorMessage: string | undefined;
      let success = result.exitCode === 0;
      
      if (!success) {
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

  async fixNextTest(queue: TestFailureQueue, options: {
    testTimeout?: number;
    configPath?: string;
    useJsonOutput?: boolean;
  } = {}): Promise<ClaudeFixNextResult> {
    // Check if Claude is available and configured
    if (!this.isEnabled()) {
      return {
        success: false,
        testFound: false,
        finalError: 'Claude integration is disabled. Enable it in your .tfqrc config file.'
      };
    }
    
    const validation = this.validateConfiguration();
    if (!validation.isValid) {
      return {
        success: false,
        testFound: false,
        finalError: validation.error
      };
    }
    
    // Get next test from queue
    const nextItem = queue.dequeueWithContext();
    if (!nextItem) {
      return {
        success: false,
        testFound: false,
        finalError: 'Queue is empty'
      };
    }
    
    const testPath = nextItem.filePath;
    const errorContext = nextItem.error;
    
    if (!options.useJsonOutput) {
      console.log(`🤖 Fixing test with Claude: ${testPath}`);
    }
    
    // Apply timeout override if provided
    let timeoutOverride: number | undefined;
    if (options.testTimeout) {
      const timeout = parseInt(options.testTimeout.toString(), 10);
      if (!isNaN(timeout) && timeout >= 60000 && timeout <= 600000) {
        timeoutOverride = timeout;
      }
    }
    
    // Fix the test
    const fixResult = await this.fixTest(testPath, errorContext, timeoutOverride);
    
    // Verify the fix if Claude processing was successful
    let verificationResult: {
      success: boolean;
      exitCode: number;
      duration: number;
      error?: string;
    } | undefined = undefined;
    let finalSuccess = fixResult.success;
    let finalError = fixResult.error;
    let requeued = false;
    let maxRetriesExceeded = false;
    
    if (fixResult.success) {
      try {
        if (!options.useJsonOutput) {
          console.log('🔍 Verifying fix by running the test...');
        }
        
        // Create TestRunner with the specific test file
        const verificationRunner = new TestRunner({
          testPath: testPath,
          verbose: false,
          configPath: options.configPath
        });
        
        const testResult = verificationRunner.run();
        verificationResult = {
          success: testResult.success,
          exitCode: testResult.exitCode,
          duration: testResult.duration,
          error: testResult.error || undefined
        };
        
        if (testResult.success) {
          if (!options.useJsonOutput) {
            console.log('✅ Test verification passed - fix confirmed!');
          }
          finalSuccess = true;
        } else {
          if (!options.useJsonOutput) {
            console.log('⚠️ Test verification failed - re-adding to queue');
            console.log(`Verification error: ${testResult.error || 'Test still fails'}`);
          }
          
          // Re-enqueue with updated error context and incremented failure count
          const maxRetries = this.config.maxIterations || 3; // Use maxIterations from Claude config
          if (nextItem.failureCount < maxRetries) {
            const newErrorContext = `Previous attempt: ${errorContext || 'No context'}\nVerification failed: ${testResult.stderr || testResult.error || 'Test still fails'}`;
            queue.enqueue(testPath, nextItem.priority, newErrorContext);
            requeued = true;
            
            if (!options.useJsonOutput) {
              console.log(`🔄 Re-enqueued test (attempt ${nextItem.failureCount + 1}/${maxRetries})`);
            }
          } else {
            maxRetriesExceeded = true;
            if (!options.useJsonOutput) {
              console.log(`❌ Max retries (${maxRetries}) exceeded - not re-enqueueing`);
            }
          }
          
          finalSuccess = false;
          finalError = `Fix verification failed: ${testResult.error || 'Test still fails'}`;
        }
      } catch (verificationError: any) {
        if (!options.useJsonOutput) {
          console.log('❌ Test verification failed with error:', verificationError.message);
        }
        
        // Re-enqueue with verification error
        const maxRetries = this.config.maxIterations || 3;
        if (nextItem.failureCount < maxRetries) {
          const newErrorContext = `Previous attempt: ${errorContext || 'No context'}\nVerification error: ${verificationError.message}`;
          queue.enqueue(testPath, nextItem.priority, newErrorContext);
          requeued = true;
          
          if (!options.useJsonOutput) {
            console.log(`🔄 Re-enqueued test due to verification error (attempt ${nextItem.failureCount + 1}/${maxRetries})`);
          }
        } else {
          maxRetriesExceeded = true;
        }
        
        finalSuccess = false;
        finalError = `Verification error: ${verificationError.message}`;
      }
    }
    
    return {
      success: finalSuccess,
      testFound: true,
      testPath: testPath,
      claudeProcessing: {
        success: fixResult.success,
        duration: fixResult.duration,
        error: fixResult.error
      },
      verification: verificationResult,
      finalError: finalError,
      requeued,
      maxRetriesExceeded
    };
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