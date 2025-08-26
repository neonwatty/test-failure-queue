import fs from 'fs';
import path from 'path';
import os from 'os';
import { ClaudeConfig } from './types.js';

export class ClaudeConfigManager {
  private config: ClaudeConfig;

  constructor(claudeConfig?: ClaudeConfig) {
    // Start with defaults and merge with provided config
    const defaults: ClaudeConfig = {
      enabled: false,
      maxIterations: 20,
      testTimeout: 420000,
      prompt: 'run the failed test file {filePath} and debug any errors you encounter one at a time'
    };
    
    // Deep merge the provided config with defaults
    this.config = { ...defaults, ...claudeConfig };
    
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
    
    // Validate CLI options
    this.validateCliOptions(claude);
    
    // Set defaults if not provided
    if (claude.enabled && !claude.claudePath) {
      const detectedPath = this.detectClaudePath();
      if (detectedPath) {
        claude.claudePath = detectedPath;
      }
    }
  }

  private validateCliOptions(claude: ClaudeConfig): void {
    // Validate outputFormat
    if (claude.outputFormat && !['text', 'json', 'stream-json'].includes(claude.outputFormat)) {
      console.warn(`Warning: Invalid outputFormat '${claude.outputFormat}', must be 'text', 'json', or 'stream-json'`);
      claude.outputFormat = 'text';
    }

    // Validate inputFormat
    if (claude.inputFormat && !['text', 'stream-json'].includes(claude.inputFormat)) {
      console.warn(`Warning: Invalid inputFormat '${claude.inputFormat}', must be 'text' or 'stream-json'`);
      claude.inputFormat = 'text';
    }

    // Validate maxTurns
    if (claude.maxTurns !== undefined) {
      if (typeof claude.maxTurns !== 'number' || claude.maxTurns < 1) {
        console.warn('Warning: Claude maxTurns must be a positive number');
        claude.maxTurns = undefined;
      }
    }

    // Validate addDir paths
    if (claude.addDir?.length) {
      claude.addDir = claude.addDir.filter(dir => {
        const expandedPath = this.expandPath(dir);
        try {
          if (!fs.existsSync(expandedPath)) {
            console.warn(`Warning: addDir path '${expandedPath}' does not exist`);
            return false;
          }
          const stat = fs.statSync(expandedPath);
          if (!stat.isDirectory()) {
            console.warn(`Warning: addDir path '${expandedPath}' is not a directory`);
            return false;
          }
          return true;
        } catch (error) {
          console.warn(`Warning: Could not validate addDir path '${expandedPath}':`, error);
          return false;
        }
      });
    }

    // Validate tool arrays
    if (claude.allowedTools?.length) {
      claude.allowedTools = claude.allowedTools.filter(tool => {
        if (typeof tool !== 'string' || tool.trim().length === 0) {
          console.warn('Warning: allowedTools must be non-empty strings');
          return false;
        }
        return true;
      });
    }

    if (claude.disallowedTools?.length) {
      claude.disallowedTools = claude.disallowedTools.filter(tool => {
        if (typeof tool !== 'string' || tool.trim().length === 0) {
          console.warn('Warning: disallowedTools must be non-empty strings');
          return false;
        }
        return true;
      });
    }

    // Validate MCP config file path
    if (claude.permissionPromptTool && typeof claude.permissionPromptTool !== 'string') {
      console.warn('Warning: permissionPromptTool must be a string');
      claude.permissionPromptTool = undefined;
    }

    // Warn about conflicting options
    if (claude.dangerouslySkipPermissions && (claude.allowedTools?.length || claude.disallowedTools?.length)) {
      console.warn('Warning: dangerouslySkipPermissions is set with allowedTools/disallowedTools - the tool restrictions may be ignored');
    }

    if (claude.continueSession && claude.resumeSession) {
      console.warn('Warning: Both continueSession and resumeSession are set - resumeSession will take precedence');
    }

    // Warn about verbose/output-format dependency (matches tfq CLI behavior)
    if (claude.verbose && (claude.outputFormat === 'json' || claude.outputFormat === 'stream-json')) {
      console.warn('Warning: verbose is disabled when outputFormat is "json" or "stream-json" - verbose output conflicts with structured JSON output');
    }
  }

  detectClaudePath(): string | null {
    // Enable debug logging via environment variable for troubleshooting
    const debug = process.env.CLAUDE_DEBUG === 'true';
    
    if (debug) console.log('🔍 Starting Claude path detection...');
    
    // Priority order for Claude path detection
    const candidatePaths = [
      process.env.CLAUDE_PATH,
      path.join(os.homedir(), '.claude', 'local', 'claude'),
      '/usr/local/bin/claude',
      'claude' // Check PATH
    ];
    
    if (debug) console.log(`   Candidate paths to check: ${JSON.stringify(candidatePaths)}`);
    
    for (let i = 0; i < candidatePaths.length; i++) {
      const candidatePath = candidatePaths[i];
      if (debug) console.log(`   [${i + 1}/${candidatePaths.length}] Checking: ${candidatePath || '(empty)'}`);
      
      if (!candidatePath) {
        if (debug) console.log(`     ❌ Empty path, skipping`);
        continue;
      }
      
      try {
        let fullPath = candidatePath;
        
        // For 'claude' command, try to resolve via which/where
        if (candidatePath === 'claude') {
          try {
            const { execSync } = require('child_process');
            const command = process.platform === 'win32' ? 'where claude' : 'which claude';
            if (debug) console.log(`     🔍 Running: ${command}`);
            fullPath = execSync(command, { encoding: 'utf8' }).trim();
            if (debug) console.log(`     ✓ which/where returned: ${fullPath}`);
          } catch (error: any) {
            if (debug) console.log(`     ❌ which/where failed: ${error.message}`);
            continue; // Not found in PATH
          }
        } else {
          fullPath = this.expandPath(candidatePath);
          if (debug) console.log(`     📁 Expanded path: ${fullPath}`);
        }
        
        if (debug) console.log(`     🔍 Checking if path exists: ${fullPath}`);
        if (fs.existsSync(fullPath)) {
          if (debug) console.log(`     ✓ Path exists`);
          const stat = fs.statSync(fullPath);
          if (stat.isFile()) {
            if (debug) console.log(`     ✓ Is a file`);
            try {
              fs.accessSync(fullPath, fs.constants.F_OK | fs.constants.X_OK);
              if (debug) console.log(`     ✅ File is executable! Found Claude at: ${fullPath}`);
              return fullPath;
            } catch (error: any) {
              if (debug) console.log(`     ❌ File not executable: ${error.message}`);
              continue;
            }
          } else {
            if (debug) console.log(`     ❌ Path exists but is not a file`);
          }
        } else {
          if (debug) console.log(`     ❌ Path does not exist`);
        }
      } catch (error: any) {
        if (debug) console.log(`     ❌ Error checking path: ${error.message}`);
        continue;
      }
    }
    
    if (debug) console.log('❌ No valid Claude path found');
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

  buildCliArguments(): string[] {
    const args = ['-p']; // Always print mode for tfq usage
    
    if (this.config.addDir?.length) {
      args.push('--add-dir', ...this.config.addDir);
    }
    if (this.config.allowedTools?.length) {
      args.push('--allowedTools', ...this.config.allowedTools);
    }
    if (this.config.disallowedTools?.length) {
      args.push('--disallowedTools', ...this.config.disallowedTools);
    }
    if (this.config.appendSystemPrompt) {
      args.push('--append-system-prompt', this.config.appendSystemPrompt);
    }
    if (this.config.outputFormat) {
      args.push('--output-format', this.config.outputFormat);
    }
    if (this.config.inputFormat) {
      args.push('--input-format', this.config.inputFormat);
    }
    // Only add verbose flag if output format is not JSON (matches tfq CLI behavior)
    if (this.config.verbose && this.config.outputFormat !== 'json' && this.config.outputFormat !== 'stream-json') {
      args.push('--verbose');
    }
    if (this.config.maxTurns) {
      args.push('--max-turns', this.config.maxTurns.toString());
    }
    if (this.config.model) {
      args.push('--model', this.config.model);
    }
    if (this.config.permissionMode) {
      args.push('--permission-mode', this.config.permissionMode);
    }
    if (this.config.permissionPromptTool) {
      args.push('--permission-prompt-tool', this.config.permissionPromptTool);
    }
    if (this.config.resumeSession) {
      args.push('--resume', this.config.resumeSession);
    }
    if (this.config.continueSession) {
      args.push('--continue');
    }
    if (this.config.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }
    
    // Add any custom arguments
    if (this.config.customArgs?.length) {
      args.push(...this.config.customArgs);
    }
    
    return args;
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