# Test Failure Queue - User Guide

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
npm install -g test-failure-queue
```

### Local Installation (For programmatic use)
```bash
npm install test-failure-queue
```

## Quick Start

```bash
# Add a failed test to the queue
tfq add tests/user.test.ts

# Get the next test to fix
tfq next

# See all failed tests
tfq list

# Get queue statistics
tfq stats
```

## CLI Usage for Humans

### Adding Failed Tests

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
import { TestFailureQueue } from 'test-failure-queue';

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
const { TestFailureQueue } = require('test-failure-queue');

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
import { TestFailureQueue } from 'test-failure-queue';
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

# Add all failed Jest tests to queue
jest --listTests --findRelatedTests $(git diff --name-only) | while read test; do
  if ! jest "$test" 2>/dev/null; then
    tfq add "$test" --json
  fi
done

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
# Collect failed tests
tfq add tests/auth.test.ts --priority 10
tfq add tests/user.test.ts --priority 5
tfq add tests/utils.test.ts

# Get summary for AI
tfq list --json > failed-tests.json

# AI processes tests one by one
while [ $(tfq list --json | jq '.count') -gt 0 ]; do
  TEST=$(tfq next --json | jq -r '.filePath')
  echo "Claude, please fix the test at: $TEST"
  # AI fixes the test...
done
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