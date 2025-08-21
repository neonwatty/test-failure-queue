# TFQ (Test Failure Queue) - User Guide

A TypeScript library for managing failed test files in a persistent SQLite queue. Perfect for developers to track and process test failures systematically.

## Table of Contents
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage for Humans](#cli-usage-for-humans)
- [CLI Usage](#cli-usage)
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
# List all supported languages and frameworks
tfq languages

# Auto-detect language and run tests
tfq run-tests --auto-detect

# Run tests for specific language
tfq run-tests --language python --framework pytest

# List available frameworks for a language
tfq run-tests --list-frameworks --language ruby

# Run tests and automatically add failures to queue
tfq run-tests --auto-detect --auto-add

# Add a failed test to the queue manually
tfq add tests/user.test.ts

# Get the next test to fix
tfq next

# See all failed tests
tfq list

# Get queue statistics
tfq stats
```

## Language-Specific Guides

### JavaScript/TypeScript

#### Supported Frameworks
- **Vitest** (default): Vite-native test runner
- **Jest**: Facebook's testing framework
- **Mocha**: Flexible testing framework
- **Jasmine**: Behavior-driven testing framework
- **AVA**: Minimal and fast test runner

#### Auto-Detection
TFQ automatically detects JavaScript projects by checking:
1. `package.json` dependencies and devDependencies
2. Test file patterns (*.test.js, *.spec.ts, etc.)
3. Common test directories (test/, tests/, __tests__/)

#### Common Commands
```bash
# Auto-detect framework from package.json
tfq run-tests --auto-detect

# Run with specific framework
tfq run-tests --language javascript --framework jest
tfq run-tests --language javascript --framework mocha
tfq run-tests --language javascript --framework vitest

# Custom test scripts
tfq run-tests "npm run test:unit" --language javascript
tfq run-tests "yarn test" --language javascript --framework jest
tfq run-tests "pnpm test" --language javascript --framework vitest
```

#### Configuration Example
```json
{
  "defaultLanguage": "javascript",
  "defaultFrameworks": {
    "javascript": "jest"
  },
  "testCommands": {
    "javascript:jest": "npm test",
    "javascript:mocha": "npm run test:mocha",
    "javascript:vitest": "pnpm test"
  }
}
```

### Ruby/Rails

#### Supported Frameworks
- **Minitest**: Ruby's built-in testing library, default for Rails

#### Auto-Detection
TFQ automatically detects Ruby projects by checking:
1. `Gemfile` for testing gems
2. Presence of `test/` directory (Minitest)
4. Rails project structure

#### Common Commands
```bash
# Auto-detect framework from Gemfile
tfq run-tests --language ruby --auto-detect

# Rails with Minitest
tfq run-tests "rails test" --language ruby --framework minitest
tfq run-tests "rails test test/models" --language ruby --framework minitest

# Additional Minitest examples
tfq run-tests "bundle exec minitest" --language ruby --framework minitest
tfq run-tests "ruby -I test test/models/*_test.rb" --language ruby --framework minitest
```

#### Configuration Example
```json
{
  "defaultLanguage": "ruby",
  "defaultFrameworks": {
    "ruby": "minitest"
  },
  "testCommands": {
    "ruby:minitest": "rails test"
  }
}
```

### Python

#### Supported Frameworks
- **pytest** (default): Feature-rich testing framework
- **unittest**: Python's built-in testing framework

#### Auto-Detection
TFQ automatically detects Python projects by checking:
1. `requirements.txt`, `setup.py`, or `pyproject.toml`
2. Presence of pytest.ini or setup.cfg with pytest configuration
3. Test file patterns (test_*.py, *_test.py)

#### Common Commands
```bash
# Auto-detect framework
tfq run-tests --language python --auto-detect

# pytest
tfq run-tests --language python --framework pytest
tfq run-tests "pytest tests/unit" --language python --framework pytest
tfq run-tests "python -m pytest -v" --language python --framework pytest

# unittest
tfq run-tests "python -m unittest" --language python --framework unittest
tfq run-tests "python -m unittest discover" --language python --framework unittest

# Additional unittest examples
tfq run-tests "python -m unittest test_module.TestClass" --language python --framework unittest
```

#### Configuration Example
```json
{
  "defaultLanguage": "python",
  "defaultFrameworks": {
    "python": "pytest"
  },
  "testCommands": {
    "python:pytest": "pytest -v",
    "python:unittest": "python -m unittest discover"
  }
}
```

## Auto-Detection Feature

### How Auto-Detection Works

TFQ can automatically detect both the programming language and test framework of your project:

1. **Language Detection**: Examines project files (package.json, Gemfile, requirements.txt)
2. **Framework Detection**: Checks for framework-specific dependencies and configuration
3. **Fallback**: Uses sensible defaults if detection is uncertain

### Using Auto-Detection

```bash
# Full auto-detection (language and framework)
tfq run-tests --auto-detect

# Auto-detect framework for specific language
tfq run-tests --language javascript --auto-detect
tfq run-tests --language python --auto-detect
tfq run-tests --language ruby --auto-detect

# Auto-detect with custom options
tfq run-tests --auto-detect --auto-add --priority 5
```

### Detection Priority

When multiple frameworks are detected, TFQ uses this priority:

**JavaScript:**
1. Jest (if jest in dependencies)
2. Vitest (if vitest in dependencies)
3. Mocha (if mocha in dependencies)
4. Jasmine (if jasmine in dependencies)
5. AVA (if ava in dependencies)

**Python:**
1. pytest (if pytest installed or pytest.ini exists)
2. unittest (default Python framework)

**Ruby:**
1. Minitest (if Rails project or test/ directory exists)

### Overriding Auto-Detection

You can always override auto-detection:

```bash
# Force specific framework even if auto-detect would choose differently
tfq run-tests --language javascript --framework mocha

# Use configuration file to set defaults
echo '{ "defaultLanguage": "python", "defaultFrameworks": { "python": "unittest" } }' > .tfqrc
tfq run-tests  # Will use Python/unittest
```

## CLI Usage for Humans

### Discovering Supported Languages and Frameworks

List all supported languages and their test frameworks:
```bash
# Display formatted list
tfq languages

# Output in JSON format
tfq languages --json
```

List frameworks for a specific language:
```bash
# List JavaScript frameworks
tfq run-tests --list-frameworks --language javascript

# List Python frameworks
tfq run-tests --list-frameworks --language python

# List Ruby frameworks
tfq run-tests --list-frameworks --language ruby

# With auto-detect (uses current project)
tfq run-tests --list-frameworks --auto-detect
```

### Running Tests and Detecting Failures

Run tests with automatic failure detection:

#### JavaScript/TypeScript
```bash
# Auto-detect language and framework
tfq run-tests --auto-detect

# Run default test command (npm test) with Vitest
tfq run-tests --language javascript --framework vitest

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

# Run Python tests with custom command
tfq run-tests "python -m pytest tests/" --language python --framework pytest

# Run with auto-add
tfq run-tests --language python --framework pytest --auto-add
```

#### Ruby
```bash
# Auto-detect Ruby framework
tfq run-tests --language ruby --auto-detect

# Run Minitest
tfq run-tests --language ruby --framework minitest

# Run Rails tests with Minitest
tfq run-tests "rails test" --language ruby --framework minitest

# Run with auto-add
tfq run-tests --language ruby --framework minitest --auto-add --priority 5
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


## CLI Usage

All commands support `--json` flag for machine-readable output.

### Listing Languages and Frameworks (JSON Mode)

```bash
# List all languages and frameworks
tfq languages --json
```

Output:
```json
{
  "success": true,
  "languages": [
    {
      "language": "javascript",
      "supportedFrameworks": ["jest", "mocha", "vitest", "jasmine", "ava"],
      "defaultFramework": "vitest"
    },
    {
      "language": "ruby",
      "supportedFrameworks": ["minitest"],
      "defaultFramework": "minitest"
    },
    {
      "language": "python",
      "supportedFrameworks": ["pytest", "unittest"],
      "defaultFramework": "pytest"
    }
  ]
}
```

### Running Tests (JSON Mode)

```bash
# Auto-detect language and framework
tfq run-tests --auto-detect --json

# Specify language
tfq run-tests --language python --json

# Specify both language and framework
tfq run-tests --language ruby --framework minitest --json
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

### Integration Example

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

### Using Core Components Directly

```typescript
// Import core components from their specific modules
import { TestFailureQueue } from 'tfq/core/queue';
import { TestDatabase } from 'tfq/core/database';
import { TestRunner } from 'tfq/core/test-runner';
import { ConfigManager } from 'tfq/core/config';
import type { QueueItem, TestRunResult } from 'tfq/core/types';

// Use core components
const db = new TestDatabase('./custom-queue.db');
const runner = new TestRunner();
const config = new ConfigManager('./config.json');

// Run tests and get results
const result: TestRunResult = await runner.run('npm test', {
  language: 'javascript',
  framework: 'jest'
});

// Process failed tests
if (!result.success && result.failingTests) {
  const queue = new TestFailureQueue({ database: db });
  result.failingTests.forEach(test => {
    queue.enqueue(test, 5);
  });
}
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
import { TestFailureQueue } from 'tfq/core/queue';
import { TestRunner } from 'tfq/core/test-runner';

const queue = new TestFailureQueue();
const runner = new TestRunner();

async function processFailedTests() {
  let testPath;
  
  while ((testPath = queue.dequeue()) !== null) {
    console.log(`Attempting to fix: ${testPath}`);
    
    const result = await runner.run(`npm test ${testPath}`, {
      language: 'javascript',
      framework: 'jest'
    });
    
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
tfq run-tests "rails test test/models" --language ruby --framework minitest --auto-add
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

### Example 3: Automation Integration

When integrating with automation tools:

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
tfq run-tests "rails test" --language ruby --auto-add

# Get summary for automation
tfq list --json > failed-tests.json

# Process tests one by one
while [ $(tfq list --json | jq '.count') -gt 0 ]; do
  TEST=$(tfq next --json | jq -r '.filePath')
  echo "Processing test: $TEST"
  # Fix the test manually or with other tools...
  tfq resolve "$TEST"
done
```

## Configuration

TFQ supports configuration files to set default options without having to pass them via CLI or programmatic API. Configuration is especially useful for multi-language projects where you want to set default languages, frameworks, and custom test commands.

### Using Configuration for Multi-Language Support

With configuration files, you can:
- Set a default language for your project
- Specify preferred test frameworks for each language
- Define custom test commands for specific framework combinations
- Avoid repetitive CLI flags

Example workflow with configuration:
```bash
# Without config (verbose)
tfq run-tests --language python --framework pytest

# With config setting defaultLanguage: "python"
tfq run-tests  # Automatically uses Python/pytest

# Override config when needed
tfq run-tests --language ruby --framework rspec
```

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
  "colorOutput": true,                 // Enable colored output
  
  // Language-specific options
  "defaultLanguage": "javascript",     // Default language when not specified
  "defaultFrameworks": {                // Default framework for each language
    "javascript": "jest",
    "ruby": "minitest",
    "python": "pytest",
    "go": "go",
    "java": "junit"
  },
  "testCommands": {                     // Custom test commands per language:framework
    "javascript:jest": "npm test",
    "javascript:mocha": "npx mocha",
    "javascript:vitest": "npx vitest run",
    "ruby:minitest": "rails test",
    "python:pytest": "pytest",
    "python:unittest": "python -m unittest"
  }
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

### Pre-built Configuration Examples

The TFQ package includes example configuration files in the `examples/configs/` directory:
- `javascript.tfqrc` - JavaScript/TypeScript project defaults
- `python.tfqrc` - Python project defaults  
- `ruby.tfqrc` - Ruby/Rails project defaults
- `multi-language.tfqrc` - Multi-language project setup

Copy and customize these for your project:
```bash
# Copy JavaScript config example
cp node_modules/tfq/examples/configs/javascript.tfqrc .tfqrc

# Or for global installation
cp $(npm root -g)/tfq/examples/configs/python.tfqrc ~/.tfqrc
```

### Programmatic Configuration

```typescript
import { TestFailureQueue } from 'tfq/core/queue';
import { ConfigManager, loadConfig } from 'tfq/core/config';

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

For language and framework selection, the precedence is:
1. CLI flags (`--language`, `--framework`)
2. Configuration file (`defaultLanguage`, `defaultFrameworks`)
3. Auto-detection (`--auto-detect`)
4. Built-in defaults (JavaScript/Vitest)

For test commands, the precedence is:
1. CLI command argument
2. Configuration file `testCommands`
3. Adapter default commands

### Example Configuration Files

**JavaScript Project** (`.tfqrc`):
```json
{
  "databasePath": "./test-queue.db",
  "defaultPriority": 0,
  "verbose": true,
  "colorOutput": true,
  "defaultLanguage": "javascript",
  "defaultFrameworks": {
    "javascript": "jest"
  },
  "testCommands": {
    "javascript:jest": "npm run test:unit",
    "javascript:mocha": "npm run test:integration",
    "javascript:vitest": "npm run test:e2e"
  }
}
```

**Python Project** (`.tfqrc`):
```json
{
  "databasePath": "~/.tfq/python-queue.db",
  "defaultLanguage": "python",
  "defaultFrameworks": {
    "python": "pytest"
  },
  "testCommands": {
    "python:pytest": "python -m pytest -v",
    "python:unittest": "python -m unittest discover",
  }
}
```

**Ruby/Rails Project** (`.tfqrc`):
```json
{
  "databasePath": "~/.tfq/rails-queue.db",
  "defaultLanguage": "ruby",
  "defaultFrameworks": {
    "ruby": "minitest"
  },
  "testCommands": {
    "ruby:minitest": "rails test",
  }
}
```

**Multi-Language Project** (`.tfqrc`):
```json
{
  "databasePath": "./multi-project-queue.db",
  "defaultLanguage": "javascript",
  "defaultFrameworks": {
    "javascript": "jest",
    "python": "pytest",
    "ruby": "minitest"
  },
  "testCommands": {
    "javascript:jest": "npm test",
    "javascript:vitest": "pnpm test",
    "python:pytest": "poetry run pytest",
    "ruby:minitest": "rails test"
  }
}
```

**CI/CD Configuration** (`.tfqrc`):
```json
{
  "databasePath": "/tmp/tfq-queue.db",
  "jsonOutput": true,
  "colorOutput": false,
  "autoCleanup": true,
  "defaultLanguage": "javascript",
  "testCommands": {
    "javascript:jest": "npm run test:ci",
    "python:pytest": "pytest --cov --junit-xml=report.xml",
    "ruby:minitest": "rails test --format progress"
  }
}
```

## Language-Specific Troubleshooting

### JavaScript/TypeScript Issues

**Problem: Test failures not detected**
- Ensure your test runner exits with non-zero code on failure
- Check that test output goes to stdout/stderr
- Try specifying the framework explicitly: `--framework jest`

**Problem: Wrong framework detected**
```bash
# Override auto-detection
tfq run-tests --language javascript --framework mocha

# Set in config file
echo '{ "defaultFrameworks": { "javascript": "mocha" } }' > .tfqrc
```

**Problem: Custom test script not working**
```bash
# Use quoted custom commands
tfq run-tests "npm run test:custom" --language javascript --framework jest
```

### Ruby/Rails Issues

**Problem: Rails tests not detected**
- Ensure you're in the Rails root directory
- Use explicit command: `tfq run-tests "rails test" --language ruby --framework minitest`
- Check that `rails` or `bundle exec` commands work

**Problem: Test framework confusion**
```bash
# Force specific framework
tfq run-tests --language ruby --framework rspec
tfq run-tests --language ruby --framework minitest
```

**Problem: Bundle exec required**
```bash
# Always use bundle exec for Ruby projects
tfq run-tests "rails test" --language ruby --framework minitest
tfq run-tests "bundle exec rails test" --language ruby --framework minitest
```

### Python Issues

**Problem: Import errors when running tests**
- Ensure you're in the project root with proper PYTHONPATH
- Use module execution: `tfq run-tests "python -m pytest" --language python`
- Activate virtual environment before running tfq

**Problem: Python tests not found**
```bash
# Use pytest or unittest explicitly
tfq run-tests "python -m pytest" --language python --framework pytest
tfq run-tests "python -m unittest" --language python --framework unittest
```

**Problem: pytest vs unittest detection**
```bash
# Force unittest even if pytest is installed
tfq run-tests --language python --framework unittest

# Or configure default
echo '{ "defaultFrameworks": { "python": "unittest" } }' > .tfqrc
```

### General Auto-Detection Issues

**Problem: Auto-detection chooses wrong language**
```bash
# Check what's detected
tfq run-tests --auto-detect --dry-run

# Force specific language
tfq run-tests --language ruby --auto-detect  # Auto-detect only framework
```

**Problem: Multi-language project confusion**
```bash
# Create project-specific config
cat > .tfqrc << EOF
{
  "defaultLanguage": "javascript",
  "testCommands": {
    "javascript:jest": "npm test",
    "python:pytest": "python -m pytest",
    "ruby:rspec": "bundle exec rspec"
  }
}
EOF

# Run tests for specific language
tfq run-tests --language python
```

## General Troubleshooting

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

5. **For automation:** Always use `--json` flag and parse the structured output

## Testing and Development

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test tests/integration/examples-integration.test.ts

# Run with coverage
npm run test:coverage
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test tests/integration/examples-integration.test.ts

# Run with coverage
npm run test:coverage
```

## Support

For issues or questions, please check the project repository or create an issue.