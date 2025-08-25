import fs from 'fs';
import path from 'path';
import os from 'os';
import { ClaudeConfig } from './types.js';

export class ClaudeConfigManager {
  private config: ClaudeConfig;

  constructor(claudeConfig?: ClaudeConfig) {
    this.config = claudeConfig || {
      enabled: false,
      maxIterations: 20,
      testTimeout: 420000,
      prompt: 'run the failed test file {filePath} and debug any errors you encounter one at a time'
    };
    
    // Validate and set defaults
    if (this.config.enabled) {
      this.validateClaudeConfig(this.config);
    }
  }

  private expandPath(filePath: string): string {
    if (filePath.startsWith('~/')) {
      return path.join(os.homedir(), filePath.slice(2));
    }
    // If path is relative, resolve it relative to current working directory
    if (!path.isAbsolute(filePath)) {
      return path.resolve(process.cwd(), filePath);
    }
    return filePath;
  }

  private validateClaudeConfig(claude: ClaudeConfig): void {
    // Validate testTimeout
    if (claude.testTimeout !== undefined) {
      if (typeof claude.testTimeout !== 'number' || claude.testTimeout < 1000) {
        console.warn('Warning: Claude testTimeout must be a number >= 1000ms');
        claude.testTimeout = 420000; // Default to 7 minutes
      }
    }
    
    // Validate maxIterations
    if (claude.maxIterations !== undefined) {
      if (typeof claude.maxIterations !== 'number' || claude.maxIterations < 1) {
        console.warn('Warning: Claude maxIterations must be a positive number');
        claude.maxIterations = 20; // Default
      }
    }
    
    // Validate Claude path if provided
    if (claude.claudePath) {
      const expandedPath = this.expandPath(claude.claudePath);
      try {
        if (!fs.existsSync(expandedPath)) {
          console.warn(`Warning: Claude path '${expandedPath}' does not exist`);
        } else {
          const stat = fs.statSync(expandedPath);
          if (!stat.isFile()) {
            console.warn(`Warning: Claude path '${expandedPath}' is not a file`);
          }
          // Check if file is executable (basic check)
          try {
            fs.accessSync(expandedPath, fs.constants.F_OK | fs.constants.X_OK);
          } catch {
            console.warn(`Warning: Claude path '${expandedPath}' may not be executable`);
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not validate Claude path '${expandedPath}':`, error);
      }
    }
    
    // Set defaults if not provided
    if (claude.enabled && !claude.claudePath) {
      const detectedPath = this.detectClaudePath();
      if (detectedPath) {
        claude.claudePath = detectedPath;
      }
    }
  }

  detectClaudePath(): string | null {
    // Priority order for Claude path detection
    const candidatePaths = [
      process.env.CLAUDE_PATH,
      path.join(os.homedir(), '.claude', 'local', 'claude'),
      '/usr/local/bin/claude',
      'claude' // Check PATH
    ];
    
    for (const candidatePath of candidatePaths) {
      if (!candidatePath) continue;
      
      try {
        let fullPath = candidatePath;
        
        // For 'claude' command, try to resolve via which/where
        if (candidatePath === 'claude') {
          try {
            const { execSync } = require('child_process');
            const command = process.platform === 'win32' ? 'where claude' : 'which claude';
            fullPath = execSync(command, { encoding: 'utf8' }).trim();
          } catch {
            continue; // Not found in PATH
          }
        } else {
          fullPath = this.expandPath(candidatePath);
        }
        
        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            try {
              fs.accessSync(fullPath, fs.constants.F_OK | fs.constants.X_OK);
              return fullPath;
            } catch {
              // Not executable, continue to next candidate
              continue;
            }
          }
        }
      } catch {
        // Error checking this path, continue to next
        continue;
      }
    }
    
    return null;
  }

  getClaudeConfig(): ClaudeConfig {
    return { ...this.config };
  }

  getClaudePath(overridePath?: string): string | null {
    // Priority: override > env var > config > auto-detect
    if (overridePath) {
      return this.expandPath(overridePath);
    }
    
    if (process.env.CLAUDE_PATH) {
      return this.expandPath(process.env.CLAUDE_PATH);
    }
    
    if (this.config.claudePath) {
      return this.expandPath(this.config.claudePath);
    }
    
    return this.detectClaudePath();
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

  static getDefaultClaudeConfig(): ClaudeConfig {
    return {
      enabled: false,
      maxIterations: 20,
      testTimeout: 420000,
      prompt: 'run the failed test file {filePath} and debug any errors you encounter one at a time'
    };
  }
}