# Calculator Example with Jest Testing

This example demonstrates how to use Test Failure Queue (TFQ) with a JavaScript project using Jest as the test framework.

## Project Structure

```
javascript/
├── src/
│   └── calculator.js       # Calculator implementation
├── tests/
│   ├── calculator.test.js  # Basic calculator tests
│   └── advanced.test.js    # Advanced feature tests
├── package.json            # Project configuration
├── .tfqrc                  # TFQ configuration
└── README.md              # This file
```

## Features

The Calculator class provides:
- Basic operations: add, subtract, multiply, divide
- Advanced operations: power, sqrt, factorial, average
- Error handling for edge cases

## Setup

Install dependencies:
```bash
npm install
```

## Running Tests

### Standard Jest Testing
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# With coverage report
npm run test:coverage

# Verbose output
npm run test:verbose
```

### Using Test Failure Queue

#### Local TFQ (from project root)
```bash
# Navigate to this directory
cd examples/core/javascript

# Run tests with local TFQ
../../../bin/tfq run-tests --auto-detect

# Or specify language/framework explicitly
../../../bin/tfq run-tests --language javascript --framework jest
```

#### Global TFQ (if installed via npm)
```bash
# Install TFQ globally
npm install -g test-failure-queue

# Run tests
tfq run-tests --auto-detect

# List supported languages
tfq languages
```

## Test Failure Queue Workflow

This example includes intentional test failures to demonstrate TFQ capabilities:

### 1. Run Initial Tests
```bash
../../../bin/tfq run-tests --auto-detect
```

Expected output:
- Several passing tests
- 5 intentional failures (marked with "FAILING" or "FLAKY")
- Failures automatically added to queue

### 2. View Queue Status
```bash
../../../bin/tfq list
```

Shows all failed tests with:
- Test names
- File paths
- Priority levels
- Failure patterns

### 3. Get Next Failure to Fix
```bash
../../../bin/tfq next
```

Returns the highest priority failure from the queue.

### 4. Fix and Mark Complete
After fixing a test:
```bash
../../../bin/tfq complete <test-id>
```

### 5. Retry Flaky Tests
```bash
../../../bin/tfq retry <test-id>
```

TFQ will retry up to 3 times (configurable in .tfqrc).

### 6. Clear Queue
```bash
../../../bin/tfq clear
```

## Intentional Test Failures

The following tests are designed to fail for demonstration:

1. **calculator.test.js**:
   - "FAILING: should handle complex division" - Expects incorrect result
   - "FAILING: should handle negative square roots" - Expects positive result from negative input
   - "FLAKY: should randomly pass or fail" - 50% chance of passing

2. **advanced.test.js**:
   - "FAILING: should handle invalid average input" - Expects 0 for empty array
   - "FAILING: should handle complex mathematical expressions" - Wrong expected value
   - "FAILING: should handle single element array" - Off by one error
   - "FLAKY: should complete calculations within time limit" - Timing-based test

## Configuration

The `.tfqrc` file configures TFQ behavior:
- Default language: JavaScript
- Default framework: Vitest
- Test patterns for failure detection
- Retry settings for flaky tests
- Priority levels for organizing failures

## Tips for Using TFQ

1. **Auto-detection**: TFQ automatically detects Jest from package.json
2. **Priority Queue**: Higher priority failures are returned first by `tfq next`
3. **Pattern Matching**: Configure custom failure patterns in .tfqrc
4. **Database Location**: Queue persists in `~/.tfq/queue.db` by default
5. **JSON Output**: Add `--json` flag for programmatic integration

## Troubleshooting

If tests don't run:
1. Ensure Jest is installed: `npm install`
2. Check Node.js version: `node --version` (requires Node 14+)
3. Verify test files match pattern: `**/tests/**/*.test.js`

If TFQ doesn't detect failures:
1. Check .tfqrc configuration
2. Ensure test output includes failure patterns
3. Run with `--verbose` for detailed output