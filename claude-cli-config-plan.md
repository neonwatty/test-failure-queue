# Plan: Configurable Claude CLI Arguments

## Documentation Reference
- Claude Code SDK Headless Mode: https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-headless

## Current Problem
Claude CLI arguments are hardcoded in the service (`-p`, `--dangerously-skip-permissions`, `--verbose`, `--output-format text`). Users cannot customize security, permissions, tools, or other CLI options based on their needs.

## Proposed Solution: Structured CLI Configuration

### 1. **Extend ClaudeConfig Interface**
Add new structured configuration options to `types.ts`:

```typescript
export interface ClaudeConfig {
  enabled: boolean;
  claudePath?: string;
  maxIterations?: number;
  testTimeout?: number;
  prompt?: string;
  
  // New: CLI configuration options
  cli?: {
    // Security & Permissions
    permissions?: {
      mode?: 'default' | 'bypassPermissions' | 'plan' | 'acceptEdits';
      dangerouslySkipPermissions?: boolean;
      allowedTools?: string[];
      disallowedTools?: string[];
    };
    
    // Output & Format
    output?: {
      format?: 'text' | 'json' | 'stream-json';
      verbose?: boolean;
    };
    
    // Model & Behavior
    model?: string;
    fallbackModel?: string;
    appendSystemPrompt?: string;
    
    // Advanced
    additionalDirectories?: string[];
    mcpConfig?: string[];
    customArgs?: string[]; // Escape hatch for unsupported flags
  };
}
```

### 2. **Update ClaudeConfigManager**
- Add validation for new CLI options
- Provide smart defaults:
  ```typescript
  private getDefaultCliConfig(): Required<ClaudeConfig['cli']> {
    return {
      permissions: {
        mode: 'default', // Safer than dangerouslySkipPermissions
        dangerouslySkipPermissions: false,
        allowedTools: undefined,
        disallowedTools: undefined
      },
      output: {
        format: 'text',
        verbose: false // Less noise by default
      },
      model: undefined,
      fallbackModel: undefined,
      appendSystemPrompt: undefined,
      additionalDirectories: [],
      mcpConfig: [],
      customArgs: []
    };
  }
  ```
- Add method: `buildCliArguments(): string[]` to convert config to CLI args
- Add validation to prevent conflicting options

### 3. **Update ClaudeService**
- Replace hardcoded CLI args with dynamic generation:
  ```typescript
  const cliArgs = this.claudeConfigManager.buildCliArguments();
  const childProcess = execa(this.claudePath!, cliArgs, { ... });
  ```

### 4. **Configuration Mapping Logic**
Create intelligent mapping from structured config to CLI args:

```typescript
buildCliArguments(): string[] {
  const args = ['-p']; // Always use print mode
  
  // Handle permissions
  if (config.permissions?.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions');
  } else if (config.permissions?.mode) {
    args.push('--permission-mode', config.permissions.mode);
  }
  
  if (config.permissions?.allowedTools?.length) {
    args.push('--allowed-tools', config.permissions.allowedTools.join(' '));
  }
  
  // Handle output
  if (config.output?.verbose) {
    args.push('--verbose');
  }
  args.push('--output-format', config.output?.format || 'text');
  
  // Handle model
  if (config.model) {
    args.push('--model', config.model);
  }
  
  // Add custom args
  args.push(...(config.customArgs || []));
  
  return args;
}
```

### 5. **Example User Configuration**

**Secure setup** (default-like):
```json
{
  "claude": {
    "enabled": true,
    "testTimeout": 60000,
    "cli": {
      "permissions": {
        "allowedTools": ["Edit", "Write", "Read"]
      },
      "output": {
        "verbose": true
      }
    }
  }
}
```

**Power user setup**:
```json
{
  "claude": {
    "enabled": true,
    "cli": {
      "permissions": {
        "dangerouslySkipPermissions": true
      },
      "output": {
        "format": "stream-json",
        "verbose": true
      },
      "model": "opus",
      "appendSystemPrompt": "Be concise in your responses."
    }
  }
}
```

### 6. **Validation & Safety**
- Warn users about dangerous options
- Prevent conflicting combinations (e.g., `dangerouslySkipPermissions: true` + `allowedTools`)
- Validate tool names against known tools
- Validate model names
- Validate file paths for directories/configs

### 7. **Backward Compatibility**
- Make all new options optional
- Current configs continue to work unchanged
- Old behavior preserved when no CLI config specified

### 8. **Benefits**
- ✅ User choice: secure defaults vs power user options
- ✅ Flexibility: support for all Claude CLI features
- ✅ Safety: validation prevents dangerous combinations
- ✅ Maintainable: structured config vs raw CLI strings
- ✅ Extensible: easy to add new options as Claude CLI evolves
- ✅ Self-documenting: clear config structure shows available options

## Implementation Order
1. Update `ClaudeConfig` interface in `types.ts`
2. Extend `ClaudeConfigManager` with CLI argument building logic
3. Update `ClaudeService` to use dynamic CLI arguments
4. Add validation and safety checks
5. Update tests to cover new configuration options
6. Update documentation with configuration examples