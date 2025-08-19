# TFQ (Test Failure Queue) - User Guide

A TypeScript library for managing failed test files in a persistent SQLite queue. Perfect for both human developers and AI agents like Claude Code to track and process test failures systematically.

## Table of Contents
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage for Humans](#cli-usage-for-humans)
- [CLI Usage for AI Agents](#cli-usage-for-ai-agents)
- [Programmatic API](#programmatic-api)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Installation

### Global Installation (Recommended for CLI)
```bash
npm install -g tfq
```

### Local Installation (For programmatic use)
```bash
npm install tfq
```

## Quick Start

```bash
# Run tests and detect failures
tfq run-tests

# Run tests and automatically add failures to queue
tfq run-tests --auto-add

# Add a failed test to the queue manually
tfq add tests/user.test.ts

# Get the next test to fix
tfq next

# See all failed tests
tfq list

# Get queue statistics
tfq stats
```

## CLI Usage for Humans

### Running Tests and Detecting Failures

Run tests with automatic failure detection:

#### JavaScript/TypeScript
```bash
# Auto-detect language and framework
tfq run-tests --auto-detect

# Run default test command (npm test) with Jest
tfq run-tests --language javascript --framework jest

# Run custom test command
tfq run-tests "npm run test:integration" --language javascript

# Specify test framework (jest, mocha, vitest, jasmine, ava)
tfq run-tests --framework mocha

# Automatically add failures to queue
tfq run-tests --auto-add

# Add failures with priority
tfq run-tests --auto-add --priority 10

# Run integration tests with Mocha and auto-add failures
tfq run-tests "npm run test:integration" --framework mocha --auto-add --priority 5
```

#### Python
```bash
# Auto-detect Python framework
tfq run-tests --language python --auto-detect

# Run pytest
tfq run-tests --language python --framework pytest

# Run unittest
tfq run-tests "python -m unittest" --language python --framework unittest

# Run Django tests
tfq run-tests "python manage.py test" --language python --framework django

# Run with auto-add
tfq run-tests --language python --framework pytest --auto-add
```

#### Ruby
```bash
# Auto-detect Ruby framework
tfq run-tests --language ruby --auto-detect

# Run RSpec
tfq run-tests --language ruby --framework rspec

# Run Rails tests with Minitest
tfq run-tests "rails test" --language ruby --framework minitest

# Run Cucumber features
tfq run-tests --language ruby --framework cucumber

# Run with auto-add
tfq run-tests --language ruby --framework rspec --auto-add --priority 5
```

### Adding Failed Tests Manually

Add a single test file:
```bash
tfq add src/tests/api.test.ts
```

Add with priority (higher priority processed first):
```bash
tfq add src/tests/critical.test.ts --priority 10
```

### Processing Failed Tests

Get the next test to fix (removes from queue):
```bash
tfq next
# Output: /Users/you/project/src/tests/api.test.ts
```

Preview the next test without removing:
```bash
tfq peek
# Output: /Users/you/project/src/tests/api.test.ts
```

### Managing the Queue

List all failed tests:
```bash
tfq list
# Output:
# Queue contains 3 file(s):
# 
# 1. /Users/you/project/tests/user.test.ts [P10] (3 failures)
# 2. /Users/you/project/tests/api.test.ts
# 3. /Users/you/project/tests/db.test.ts (2 failures)
```

Remove a specific file:
```bash
tfq remove tests/fixed.test.ts
```

Clear entire queue:
```bash
tfq clear --confirm
```

Search for files:
```bash
tfq search "api"
# Shows all files containing "api" in the path
```

### View Statistics

```bash
tfq stats
# Output:
# Queue Statistics:
# 
# Total items: 5
# Average failure count: 2.40
# 
# Oldest item:
#   /Users/you/project/tests/user.test.ts [P5] (4 failures)
#   Added: 12/1/2024, 10:30:00 AM
# 
# Items by priority:
#   Priority 10: 2 item(s)
#   Priority 5: 1 item(s)
#   Priority 0: 2 item(s)
```

## CLI Usage for AI Agents

All commands support `--json` flag for machine-readable output.

### Running Tests (JSON Mode)

```bash
# Auto-detect language and framework
tfq run-tests --auto-detect --json

# Specify language
tfq run-tests --language python --json

# Specify both language and framework
tfq run-tests --language ruby --framework rspec --json
```

Output:
```json
{
  "success": false,
  "exitCode": 1,
  "failingTests": [
    "src/tests/auth.test.ts",
    "src/tests/api.test.ts"
  ],
  "totalFailures": 2,
  "duration": 3500,
  "language": "javascript",
  "framework": "jest",
  "command": "npm test",
  "error": null
}
```

Run with auto-add:
```bash
tfq run-tests --auto-add --priority 5 --json
```

### Adding Tests (JSON Mode)

```bash
tfq add tests/failing.test.ts --priority 5 --json
```

Output:
```json
{
  "success": true,
  "message": "File added to queue",
  "filePath": "/absolute/path/tests/failing.test.ts",
  "priority": 5
}
```

### Getting Next Test (JSON Mode)

```bash
tfq next --json
```

Success output:
```json
{
  "success": true,
  "filePath": "/absolute/path/tests/failing.test.ts"
}
```

Empty queue output:
```json
{
  "success": false,
  "message": "Queue is empty"
}
```

### Listing Tests (JSON Mode)

```bash
tfq list --json
```

Output:
```json
{
  "success": true,
  "count": 2,
  "items": [
    {
      "filePath": "/path/tests/critical.test.ts",
      "priority": 10,
      "failureCount": 1,
      "createdAt": "2024-12-01T10:30:00.000Z",
      "lastFailure": "2024-12-01T10:30:00.000Z"
    },
    {
      "filePath": "/path/tests/user.test.ts",
      "priority": 0,
      "failureCount": 3,
      "createdAt": "2024-12-01T09:00:00.000Z",
      "lastFailure": "2024-12-01T11:45:00.000Z"
    }
  ]
}
```

### AI Agent Integration Example

```bash
# Run tests and automatically populate queue
tfq run-tests --auto-add --priority 5 --json

# Check if queue has items
RESULT=$(tfq list --json)
COUNT=$(echo $RESULT | jq '.count')

if [ "$COUNT" -gt 0 ]; then
  # Get next test
  TEST=$(tfq next --json | jq -r '.filePath')
  
  # Process the test file
  echo "Processing: $TEST"
  
  # If test still fails, add it back with higher priority
  if [ $TEST_FAILED ]; then
    tfq add "$TEST" --priority 10 --json
  fi
fi
```

## Programmatic API

### TypeScript Usage

```typescript
import { TestFailureQueue } from 'tfq';

// Initialize queue
const queue = new TestFailureQueue({
  databasePath: './custom-queue.db' // Optional, defaults to ~/.tfq/queue.db
});

// Add failed tests
queue.enqueue('/path/to/test.ts');
queue.enqueue('/path/to/critical.test.ts', 10); // With priority

// Process tests
const nextTest = queue.dequeue(); // Returns path or null
const peekTest = queue.peek();    // View without removing

// Query queue
const allTests = queue.list();    // Get all items
const size = queue.size();        // Count items
const hasTest = queue.contains('/path/to/test.ts');

// Search
const apiTests = queue.search('api');           // SQL LIKE search
const jsTests = queue.searchGlob('**/*.js');    // Glob pattern

// Manage queue
queue.remove('/path/to/fixed.test.ts');
queue.clear(); // Remove all

// Statistics
const stats = queue.getStats();
console.log(`Total failures: ${stats.totalItems}`);
console.log(`Average failures per test: ${stats.averageFailureCount}`);

// Clean up
queue.close();
```

### JavaScript Usage

```javascript
const { TestFailureQueue } = require('tfq');

const queue = new TestFailureQueue();

// Add test
queue.enqueue('./tests/failing.test.js');

// Get next test
const next = queue.dequeue();
if (next) {
  console.log(`Fix this test: ${next}`);
} else {
  console.log('No failed tests!');
}
```

## Examples

### Example 1: Test Runner Integration

```typescript
import { TestFailureQueue } from 'tfq';
import { runTests } from './test-runner';

const queue = new TestFailureQueue();

async function processFailedTests() {
  let testPath;
  
  while ((testPath = queue.dequeue()) !== null) {
    console.log(`Attempting to fix: ${testPath}`);
    
    const result = await runTests(testPath);
    
    if (!result.success) {
      // Test still failing, add back with increased priority
      queue.enqueue(testPath, 5);
      console.log(`Test still failing, re-queued with priority 5`);
    } else {
      console.log(`Test fixed! ✓`);
    }
  }
}
```

### Example 2: Batch Processing Failed Tests

```bash
#!/bin/bash

# JavaScript project
tfq run-tests --language javascript --auto-detect --auto-add --priority 5

# Python project
tfq run-tests --language python --framework pytest --auto-add

# Ruby/Rails project
tfq run-tests --language ruby --framework minitest --auto-add --priority 10

# Or run specific test suites with different frameworks
tfq run-tests "npm run test:unit" --framework jest --auto-add
tfq run-tests "bundle exec rspec spec/models" --language ruby --framework rspec --auto-add
tfq run-tests "python -m pytest tests/unit" --language python --framework pytest --auto-add

# Process queue
while true; do
  TEST=$(tfq next --json | jq -r '.filePath')
  if [ "$TEST" = "null" ]; then
    echo "All tests processed!"
    break
  fi
  
  echo "Fixing: $TEST"
  # Your fix logic here
done
```

### Example 3: Claude Code Integration

When using with Claude Code or other AI agents:

```bash
# Auto-detect language and framework for any project
tfq run-tests --auto-detect --auto-add --priority 5

# Or explicitly specify for different languages
tfq run-tests --language javascript --auto-detect --auto-add
tfq run-tests --language python --framework pytest --auto-add --priority 10
tfq run-tests --language ruby --framework rspec --auto-add

# Mixed language project example
tfq run-tests "npm test" --language javascript --auto-add
tfq run-tests "pytest" --language python --auto-add
tfq run-tests "bundle exec rspec" --language ruby --auto-add

# Get summary for AI
tfq list --json > failed-tests.json

# AI processes tests one by one
while [ $(tfq list --json | jq '.count') -gt 0 ]; do
  TEST=$(tfq next --json | jq -r '.filePath')
  echo "Claude, please fix the test at: $TEST"
  # AI fixes the test...
done
```

## Configuration

TFQ supports configuration files to set default options without having to pass them via CLI or programmatic API.

### Configuration File Locations

The library searches for configuration files in the following order (first found wins):

1. Custom path specified via `--config` flag
2. `./.tfqrc` - Project-local configuration
3. `~/.tfqrc` - User home directory configuration
4. `~/.tfq/config.json` - Alternative location in TFQ directory

### Configuration Options

```json
{
  "databasePath": "~/.tfq/queue.db",  // Database file location
  "defaultPriority": 0,                // Default priority for new items
  "autoCleanup": false,                // Auto-cleanup old items
  "maxRetries": 3,                     // Maximum retry attempts
  "verbose": false,                    // Enable verbose output
  "jsonOutput": false,                 // Default to JSON output
  "colorOutput": true                  // Enable colored output
}
```

### CLI Configuration Management

```bash
# Create default config file in current directory
tfq config --init

# Show current configuration
tfq config --show

# Show config file path being used
tfq config --path

# Use custom config file
tfq --config /path/to/config.json add test.js
```

### Programmatic Configuration

```typescript
import { TestFailureQueue, ConfigManager, loadConfig } from 'tfq';

// Load config from default locations
const config = loadConfig();

// Load config from custom path
const customConfig = loadConfig('/path/to/config.json');

// Create queue with config
const queue = new TestFailureQueue({
  configPath: '/path/to/config.json'
});

// Use ConfigManager directly
const manager = new ConfigManager('/path/to/config.json');
const currentConfig = manager.getConfig();
```

### Configuration Precedence

When multiple configuration sources are available, they are applied in this order (later overrides earlier):

1. Default values
2. Configuration file
3. Command-line arguments or programmatic options

### Example Configuration Files

**Development Configuration** (`.tfqrc`):
```json
{
  "databasePath": "./test-queue.db",
  "defaultPriority": 0,
  "verbose": true,
  "colorOutput": true
}
```

**CI/CD Configuration** (`.tfqrc`):
```json
{
  "databasePath": "/tmp/tfq-queue.db",
  "jsonOutput": true,
  "colorOutput": false,
  "autoCleanup": true
}
```

## Troubleshooting

### Database Location

By default, the database is stored at `~/.tfq/queue.db`. You can:

1. Use a custom location:
```typescript
const queue = new TestFailureQueue({
  databasePath: './my-queue.db'
});
```

2. Check current database:
```bash
ls -la ~/.tfq/
```

### Permission Issues

If you encounter permission errors:
```bash
# Fix permissions
chmod 755 ~/.tfq
chmod 644 ~/.tfq/queue.db
```

### Reset Queue

To completely reset:
```bash
# Option 1: Clear via CLI
tfq clear --confirm

# Option 2: Delete database
rm -rf ~/.tfq/queue.db
```

### Debugging

Enable verbose mode in code:
```typescript
const queue = new TestFailureQueue({
  databasePath: './queue.db',
  verbose: true  // Logs SQL queries
});
```

### Common Issues

**Queue not persisting between sessions:**
- Check you're using the same database path
- Ensure the database file isn't being deleted

**Duplicate entries:**
- The queue automatically prevents duplicates
- Re-adding a file increments its failure count

**Performance with large queues:**
- The queue uses indexes for fast operations
- Even with thousands of items, operations remain fast

## Database Schema

For reference, the underlying SQLite schema:

```sql
CREATE TABLE failed_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT UNIQUE NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  failure_count INTEGER DEFAULT 1,
  last_failure DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_priority_created 
ON failed_tests(priority DESC, created_at ASC);
```

## Best Practices

1. **Use priorities for critical tests:** Set higher priorities (10-100) for tests that block deployment

2. **Clean up regularly:** Clear fixed tests to keep the queue manageable

3. **Integrate with CI/CD:** Automatically add failed CI tests to the queue

4. **Track patterns:** Use stats to identify frequently failing tests

5. **For AI agents:** Always use `--json` flag and parse the structured output

## Support

For issues or questions, please check the project repository or create an issue.