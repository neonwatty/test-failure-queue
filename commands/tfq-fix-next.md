# tfq fix-next - Fix Next Test in Queue with Claude

## Description
Retrieves the next test from the queue and uses Claude to fix it automatically. Simple, sequential processing of one test at a time.

## Usage
```bash
tfq fix-next [options]
```

## Options
- `--claude-path <path>` - Path to Claude executable (overrides config)
- `--test-timeout <ms>` - Timeout per test in milliseconds (overrides config)
- `--json` - Output in JSON format
- `--config <path>` - Custom config file path

## Configuration
Enable Claude integration in your `.tfqrc` file:
```json
{
  "claude": {
    "enabled": true,
    "claudePath": "/Users/username/.claude/local/claude",
    "testTimeout": 420000,
    "prompt": "run the failed test file {filePath} and debug any errors you encounter one at a time"
  }
}
```

## Implementation Flow

### 1. Validation
- Check if Claude integration is enabled
- Validate Claude path exists and is executable
- Verify configuration settings

### 2. Get Next Test
- Dequeue the next test from the failure queue
- Exit if queue is empty

### 3. Fix Test with Claude
- Launch Claude with the failing test path
- Include error context from previous test runs
- Apply configured timeout per test
- Handle Claude process output and errors

### 4. Report Results
- Display success/failure status
- Show processing duration
- Display remaining queue statistics

## Error Handling
- Configuration validation with clear error messages
- Graceful handling of Claude process failures
- Timeout management for long-running fixes
- JSON output support for scripting

## Examples
```bash
# Fix next test with default settings
tfq fix-next

# Override Claude path
tfq fix-next --claude-path /custom/path/to/claude

# Set custom timeout (10 minutes)
tfq fix-next --test-timeout 600000

# JSON output for scripting
tfq fix-next --json
```