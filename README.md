# TFQ (Test Failure Queue)

[![npm version](https://badge.fury.io/js/tfq.svg)](https://badge.fury.io/js/tfq)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A multi-language test failure management tool with persistent SQLite storage and AI-powered test fixing, supporting JavaScript, Python, and Ruby test frameworks.

## Overview

TFQ (Test Failure Queue) is a command-line tool designed to help developers efficiently manage and retry failed tests across multiple programming languages and test frameworks.  It maintains a persistent queue of test failures, allowing you to track, prioritize, and systematically work through test failures across multiple test runs. 

tfq integrates with Claude Code SDK to automatically analyze and fix failing tests in independent, self-contained sessions.

## How It Works

### Complete Workflow Example

Let's walk through using TFQ on a JavaScript project to discover and fix failing tests:

#### Step 1: Run Tests to Discover Failures
```bash
$ tfq run-tests --auto-detect
Auto-detected: JavaScript project using Jest
Running: npm test
=============================================
  PASS  src/utils/validator.test.js
  PASS  src/services/user.test.js
  FAIL  src/utils/calculator.test.js
  FAIL  src/api/auth.test.js
  FAIL  src/components/Button.test.js
=============================================
Test Suites: 3 failed, 2 passed, 5 total
Tests:       8 failed, 15 passed, 23 total

✗ 3 tests failed
- src/utils/calculator.test.js
- src/api/auth.test.js
- src/components/Button.test.js
```

#### Step 2: Add Failures to Queue
```bash
$ tfq run-tests --auto-detect --auto-add --priority 5
Running tests and adding failures to queue...
Added 3 failing tests to queue with priority 5
```

#### Step 3: Check Queue Status
```bash
$ tfq list
Queue contains 3 file(s):
1. src/utils/calculator.test.js [P5] (1 failure)
2. src/api/auth.test.js [P5] (1 failure)
3. src/components/Button.test.js [P5] (1 failure)
```

#### Step 4: Fix Tests One by One
```bash
$ tfq fix-tests --verbose
```

The command will:
1. **Dequeue first test**: Gets `src/utils/calculator.test.js` from queue
2. **Analyze context**: Finds `src/utils/calculator.js` as related file
3. **Generate fix prompt**: Sends test code, error output, and source code to Claude
4. **Apply fix**: Claude suggests changing `a - b` to `a + b`
5. **Verify**: Runs the test again to check if it passes
6. **Update queue**: Removes from queue if fixed, re-queues with higher priority if still failing
7. **Repeat**: Moves to next test until queue is empty

**Output looks like:**
```
Processing test 1/3: src/utils/calculator.test.js
  Reading test file...
  Found related files: src/utils/calculator.js
  Generating fix with Claude Code SDK...
  Applying suggested fix...
  Running test to verify...
  ✓ Test now passing!

Processing test 2/3: src/api/auth.test.js
  Reading test file...
  Found related files: src/api/auth.js, src/middleware/auth.js
  Generating fix with Claude Code SDK...
  Applying suggested fix...
  Running test to verify...
  ✓ Test now passing!

Processing test 3/3: src/components/Button.test.js
  Reading test file...
  Found related files: src/components/Button.jsx
  Generating fix with Claude Code SDK...
  Attempt 1 failed, retrying...
  Attempt 2 failed, retrying...
  Attempt 3 failed
  ✗ Could not fix after 3 attempts
  Re-queued with priority 10

Summary:
- Fixed: 2 tests
- Failed: 1 test
- Remaining in queue: 1
```

### Key Points

1. **One at a Time**: `tfq fix-tests` processes tests sequentially, not in parallel
2. **Smart Context**: It finds related source files to provide context to Claude
3. **Retry Logic**: Failed fixes are retried with configurable limits
4. **Priority Queue**: Failed fixes get re-queued with higher priority
5. **Language Agnostic**: Works with JavaScript, Python, Ruby, and their test frameworks

### Customizable Prompts

While `tfq fix-tests` includes an optimized default prompt for test fixing, you can customize it:

```bash
# Use default prompt (optimized for test fixing)
tfq fix-tests

# Provide your own custom system prompt
tfq fix-tests --system-prompt "Focus on fixing syntax errors first, then logic errors"

# Specialized prompts for different scenarios
tfq fix-tests --system-prompt "Fix React component tests, ensure proper mocking"
tfq fix-tests --system-prompt "Fix Python tests, follow PEP 8 style guidelines"
```

### Claude Code Custom Slash Commands

TFQ is designed to work seamlessly with Claude Code's custom slash commands. A single slash command can handle the complete workflow - testing, recording failures, and fixing them all in one go.

**Setting up a complete workflow slash command:**

1. In Claude Code, create a new slash command (e.g., `/fix-all-tests`)
2. Configure it to run: `tfq run-tests --auto-detect --auto-add && tfq fix-tests --verbose`
3. Now when you type `/fix-all-tests` in Claude Code, it will:
   - Run all tests in your project
   - Auto-detect the language and framework
   - Record all failures to the queue
   - Fix each failing test one by one
   - Show you the complete progress and results

**Example slash command configurations:**

```bash
# Complete workflow: test, record, and fix
/fix-all-tests → tfq run-tests --auto-detect --auto-add && tfq fix-tests --verbose

# Test and fix with custom priority
/fix-critical → tfq run-tests --auto-detect --auto-add --priority 10 && tfq fix-tests

# Preview what would be fixed without making changes
/preview-fixes → tfq run-tests --auto-detect --auto-add && tfq fix-tests --dry-run

# Quick fix with minimal retries
/quick-fix → tfq run-tests --auto-detect --auto-add && tfq fix-tests --max-retries 1

# Fix only existing queue (skip testing)
/fix-queue → tfq fix-tests --verbose
```

This integration allows you to trigger the complete test-and-fix workflow with a single command, making TFQ a natural extension of your Claude Code development environment.

## Features

### Core Features
- **Multi-Language Support**: JavaScript/TypeScript, Python, and Ruby
- **Multiple Test Frameworks**: 
  - JavaScript: Jest, Mocha, Vitest, Jasmine, AVA
  - Python: pytest, unittest
  - Ruby: Minitest
- **Auto-Detection**: Automatically detects language and test framework
- **Persistent Storage**: Uses SQLite to maintain test failure history across sessions
- **Priority Management**: Assign priorities to different test files
- **Pattern Matching**: Support for glob patterns to manage multiple files at once
- **Failure Tracking**: Automatically tracks failure counts and timestamps
- **Multiple Output Formats**: JSON output for programmatic usage
- **Cross-Project Support**: Manage test queues for multiple projects

## Installation

```bash
npm install tfq
```

Or install globally:

```bash
npm install -g tfq
```

### Claude Code SDK Setup

To use the Claude Code test fixing feature, you'll need an Claude Code API key:

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Set the environment variable:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key-here"
   ```
   Or create a `.env` file in your project:
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   ```

**⚠️ Cost Warning**: AI features use the Anthropic API which incurs costs. 

## Supported Languages

### JavaScript/TypeScript
- **Frameworks**: Jest, Mocha, Vitest, Jasmine, AVA
- **Auto-detection**: via package.json dependencies
- **Default command**: `npm test`

### Python
- **Frameworks**: pytest, unittest
- **Auto-detection**: via requirements.txt, setup.py, or pyproject.toml
- **Default command**: `pytest` or `python -m unittest`

### Ruby
- **Frameworks**: Minitest
- **Auto-detection**: via Gemfile or directory structure
- **Default command**: `rails test`

## Documentation

- [User Guide](./docs/USER_GUIDE.md) - Comprehensive user documentation
- [API Documentation](./docs/API_DOCUMENTATION.md) - Technical API reference for developers
- [Changelog](./docs/CHANGELOG.md) - Version history and changes
- [Release Notes](./docs/RELEASE_NOTES.md) - Latest release information

## Usage

### CLI Commands

#### List supported languages and frameworks
```bash
tfq languages
tfq languages --json
```

#### Run tests with language support
```bash
# Auto-detect language and framework
tfq run-tests --auto-detect

# Specify language
tfq run-tests --language javascript --framework jest
tfq run-tests --language python --framework pytest
tfq run-tests --language ruby --framework minitest

# List available frameworks for a language
tfq run-tests --list-frameworks --language python

# Run tests and auto-add failures to queue
tfq run-tests --auto-detect --auto-add --priority 5
```

#### Add a failed test to the queue
```bash
tfq add path/to/test.spec.ts
tfq add path/to/test.spec.ts --priority 5
```

#### View the next test to work on
```bash
tfq next
tfq next --json
```

#### List all queued tests
```bash
tfq list
tfq list --limit 5
tfq list --json
```

#### Mark a test as resolved
```bash
tfq resolve path/to/test.spec.ts
```

#### Clear the entire queue
```bash
tfq clear
tfq clear --force  # Skip confirmation
```

#### View queue statistics
```bash
tfq stats
tfq stats --json
```

#### Test Fixing using Claude Code SDK
```bash
# Fix all tests in queue 
tfq fix-tests

# Run tests first to populate queue, then fix them
tfq fix-tests --auto-run

# Dry run mode (preview fixes without applying them)
tfq fix-tests --dry-run

# Configure fixing behavior
tfq fix-tests --max-retries 5 --max-iterations 15

# Specify language and framework
tfq fix-tests --language javascript --framework jest

# Custom system prompt
tfq fix-tests --system-prompt "Focus on fixing syntax errors first"

# Verbose output with detailed logging
tfq fix-tests --verbose

# JSON output for programmatic usage
tfq fix-tests --json
```

### Programmatic API

```typescript
import { TestFailureQueue } from 'tfq';

const queue = new TestFailureQueue();

// Add a failed test
queue.enqueue('/path/to/test.spec.ts', 5);

// Get the next test to work on
const next = queue.dequeue();
if (next) {
  console.log(`Work on: ${next.filePath}`);
}

// List all tests
const allTests = queue.list();

// Resolve a test
queue.resolve('/path/to/test.spec.ts');

// Get statistics
const stats = queue.getStats();
console.log(`Total failures: ${stats.totalItems}`);
```

### Core API Usage

The core TFQ functionality is available from the main export, but you can also import directly from the core modules:

```typescript
import { TestFailureQueue } from 'tfq/core/queue';
import { TestDatabase } from 'tfq/core/database';
import { TestRunner } from 'tfq/core/test-runner';
import { ConfigManager } from 'tfq/core/config';

// Use core components directly
const db = new TestDatabase('./custom-queue.db');
const runner = new TestRunner();
const config = new ConfigManager();
```

### Claude AI Integration

The AI-powered test fixing features are provided through the Claude integration:

```typescript
import { TestFixer } from 'tfq/integrations/claude/test-fixer';
import { ClaudeCodeClient } from 'tfq/integrations/claude/claude-code-client';

// Initialize the test fixer
const fixer = new TestFixer({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3
});

// Fix failing tests
await fixer.fixAllTests();
```

## Configuration

The queue database is stored in your home directory by default:
- Location: `~/.tfq/queue.db`

You can also use a project-specific database by setting the `TFQ_DB_PATH` environment variable:

```bash
export TFQ_DB_PATH=./my-project-queue.db
```

## Use Cases

### Integration with Test Runners

You can integrate TFQ with your test runner to automatically track failures:

```bash
# Auto-detect and run tests for any language
tfq run-tests --auto-detect --auto-add

# Language-specific examples
tfq run-tests --language javascript --framework jest --auto-add
tfq run-tests --language python --framework pytest --auto-add
tfq run-tests --language ruby --framework minitest --auto-add

# Work through failures one by one
while tfq next; do
  FILE=$(tfq next --json | jq -r '.filePath')
  npm test "$FILE"  # or pytest, minitest, etc.
  if [ $? -eq 0 ]; then
    tfq resolve "$FILE"
  fi
done
```

### Prioritizing Critical Tests

```bash
# Add critical tests with high priority
tfq add src/auth/*.test.ts --priority 10
tfq add src/payments/*.test.ts --priority 9

# Work on high priority tests first
tfq next  # Returns highest priority test
```

### Claude Code SDK Development Workflow

```bash
# Complete automated fix workflow
export ANTHROPIC_API_KEY="your-api-key"

# 1. Run tests and automatically populate queue with failures
tfq run-tests --auto-detect --auto-add

# 2. Use AI to fix all queued failures
tfq fix-tests --auto-run --verbose

# 3. Check fix results
tfq stats

# Alternative: Step-by-step workflow
tfq run-tests --auto-detect --auto-add
tfq fix-tests --dry-run  # Preview fixes first
tfq fix-tests           # Apply fixes
npm test                # Verify fixes worked
```

### Cost Management for AI Features

```bash
# Check estimated costs before running
tfq fix-tests --dry-run --json | jq '.estimatedCost'

# Monitor usage during fixing
tfq fix-tests --verbose  # Shows token usage and costs

# Use custom prompts to reduce token usage
tfq fix-tests --system-prompt "Provide minimal fixes only"
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Project Structure

```
tfq/
├── src/
│   ├── index.ts              # Main exports
│   ├── cli.ts                # CLI implementation
│   ├── core/                 # Core TFQ functionality
│   │   ├── queue.ts          # Queue implementation
│   │   ├── database.ts       # Database management
│   │   ├── types.ts          # TypeScript types
│   │   ├── test-runner.ts    # Multi-language test execution
│   │   └── config.ts         # Configuration management
│   ├── integrations/         # Third-party integrations
│   │   └── claude/           # Claude AI integration
│   │       ├── test-fixer.ts         # AI-powered test fixing
│   │       ├── claude-code-client.ts # Claude AI client wrapper
│   │       └── types.ts              # Claude integration types
│   └── adapters/             # Language-specific adapters
│       ├── base.ts           # Base adapter interface
│       ├── registry.ts       # Adapter registry
│       ├── javascript-adapter.ts # JavaScript/TypeScript adapter
│       ├── python-adapter.ts     # Python adapter
│       └── ruby-adapter.ts       # Ruby adapter
├── tests/
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── dist/                     # Compiled JavaScript
├── bin/
│   └── tfq                   # CLI executable
└── package.json
```

## Contributing

Contributions are welcome!  Please feel free to submit a Pull Request.
