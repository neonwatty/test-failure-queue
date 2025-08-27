# TFQ (Test Failure Queue) - Summary

## Description
Multi-language test failure management tool with persistent SQLite storage. Tracks, prioritizes, and manages failed tests across JavaScript/TypeScript, Python, and Ruby projects.

## Essential CLI Commands

### Setup
```bash
tfq init                           # Initialize TFQ for current project (auto-configures Claude if available)
tfq init --db-path ./custom.db     # Initialize with custom database path
tfq init --with-claude             # Force Claude Code integration setup
tfq init --skip-claude             # Skip Claude Code integration
tfq init --interactive             # Interactive setup with Claude prompts
tfq init --claude-path /path/to/claude  # Custom Claude executable path
```

### Running Tests
```bash
tfq run-tests --auto-detect --auto-add    # Run tests and queue failures
tfq run-tests --language python --framework pytest --auto-add
```

### Queue Management
```bash
tfq list                          # View all queued test failures
tfq list --json                   # JSON output
tfq count                         # Get number of items in queue
tfq next                          # Get next test to work on (removes from queue)
tfq peek                          # View next test without removing
tfq stats                         # Show queue statistics
```

### Adding/Resolving Tests
```bash
tfq add path/to/test.spec.ts      # Add specific test to queue
tfq add path/to/test.spec.ts --priority 5    # Add with priority
tfq resolve path/to/test.spec.ts  # Mark test as resolved
```

### Queue Operations
```bash
tfq clear                         # Clear entire queue (with confirmation)
tfq clear --force                 # Clear without confirmation
```

### Test Grouping
```bash
tfq set-groups --json '[["test1.js", "test2.js"], ["test3.js"]]'
tfq get-groups                    # View current groups
tfq next --group                  # Get next group of tests
```

### AI-Powered Test Fixing (Claude Code Integration)
```bash
tfq fix-next                      # Fix next test with AI
tfq fix-all                       # Fix all tests iteratively with AI
tfq fix-all --max-iterations 5    # Limit number of fixes
tfq fix-next --test-timeout 300000  # Custom timeout (milliseconds)
```

### Claude Configuration Options
All [Claude CLI options](https://docs.anthropic.com/en/docs/claude-code/cli-reference) supported in `.tfqrc`:
```json
{
  "claude": {
    "enabled": true,
    "dangerouslySkipPermissions": true,  // Skip prompts (dev mode)
    "allowedTools": ["Edit", "Read"],    // Permitted tools
    "outputFormat": "text|json",         // Output format
    "verbose": true,                     // Detailed logging
    "maxTurns": 5,                      // Conversation limit
    "model": "sonnet",                  // Model selection
    "addDir": ["/path"],                // Extra directories
    "customArgs": ["--flags"]           // Additional CLI args
  }
}
```

**Quick configs:** Safe: `"allowedTools": ["Read", "Edit"]` | Dev: `"dangerouslySkipPermissions": true` | Production: `"outputFormat": "json"`

## Configuration

### Database Location
- **Default**: `~/.tfq/tfq.db` (global)
- **Project-specific**: `./.tfq/tfq.db` (after `tfq init`)
- **Environment variable**: `TFQ_DB_PATH=./custom-path.db`

### Configuration File (`.tfqrc`)
Created by `tfq init`, contains:
- Database path
- Auto-detected language and framework
- Default priority and settings
- **Claude Code integration** (if available)

## Quick Start Workflow

```bash
# 1. Initialize for your project (auto-configures Claude Code if available)
tfq init

# 2. Run tests and queue failures
tfq run-tests --auto-detect --auto-add

# 3. Check what failed
tfq list

# 4. Work through failures
tfq next              # Get next test to fix
# ... fix the test manually ...
tfq resolve path/to/fixed-test.js

# OR: Use AI to fix automatically (if Claude configured)
tfq fix-next          # AI fixes next test
tfq fix-all           # AI fixes all queued tests

# 5. Clear queue when done
tfq clear
```

## Supported Languages & Frameworks

| Language | Frameworks | Auto-Detection |
|----------|------------|----------------|
| JavaScript/TypeScript | Jest, Mocha, Vitest, Jasmine, AVA | package.json |
| Python | pytest, unittest | requirements.txt, setup.py, pyproject.toml |
| Ruby | Minitest, RSpec | Gemfile, directory structure |
