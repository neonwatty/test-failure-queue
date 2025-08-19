# TFQ (Test Failure Queue)

A TypeScript library for managing failed test files in a persistent queue using SQLite.

## Overview

TFQ (Test Failure Queue) is a command-line tool designed to help developers efficiently manage and retry failed tests. It maintains a persistent queue of test failures, allowing you to track, prioritize, and systematically work through test failures across multiple test runs.

## Features

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

## Usage

### CLI Commands

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
# Run tests and add failures to queue
npm test 2>&1 | grep "FAIL" | awk '{print $2}' | xargs -I {} tfq add {}

# Work through failures one by one
while tfq next; do
  FILE=$(tfq next --json | jq -r '.filePath')
  npm test "$FILE"
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
│   ├── index.ts       # Main exports
│   ├── queue.ts       # Queue implementation
│   ├── database.ts    # Database management
│   ├── types.ts       # TypeScript types
│   └── cli.ts         # CLI implementation
├── dist/              # Compiled JavaScript
├── bin/
│   └── tfq           # CLI executable
└── package.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

Created with the help of Claude Code Assistant

---

Built with TypeScript, Commander.js, Better-SQLite3, and Chalk.