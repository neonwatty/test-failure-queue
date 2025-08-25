import { execa } from 'execa';
import chalk from 'chalk';
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
    
    // Prepare the prompt
    let prompt = this.config.prompt || 'run the failed test file {filePath} and debug any errors you encounter one at a time';
    prompt = prompt.replace('{filePath}', filePath);
    
    if (errorContext) {
      prompt += `\n\nPrevious error context:\n${errorContext}`;
    }
    
    try {
      const timeout = this.config.testTimeout || 420000; // Default 7 minutes
      
      const result = await execa(this.claudePath!, [
        '-p',
        '--dangerously-skip-permissions', 
        prompt
      ], {
        stdio: ['inherit', 'pipe', 'pipe'],
        timeout,
        env: process.env
      });
      
      return {
        success: result.exitCode === 0,
        error: result.exitCode !== 0 ? result.stderr || 'Claude process failed' : undefined,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
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
}

// Singleton for easy access
let instance: ClaudeService | null = null;

export function getClaudeService(configPath?: string, overrideClaudePath?: string): ClaudeService {
  if (!instance || configPath || overrideClaudePath) {
    instance = new ClaudeService(configPath, overrideClaudePath);
  }
  return instance;
}