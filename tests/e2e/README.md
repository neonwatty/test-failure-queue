# E2E Claude Integration Tests

This directory contains end-to-end tests that require the actual Claude Code CLI to be installed and available.

## Prerequisites

1. **Install Claude Code CLI** - Follow the installation instructions from Anthropic
2. **Verify Claude is available** - Run `claude --version` in your terminal
3. **Ensure examples/javascript exists** - The tests use the JavaScript example as a test fixture

## Running the Tests

### Enable E2E Tests
```bash
export TFQ_TEST_CLAUDE=true
```

### Run All E2E Tests
```bash
npm test -- tests/e2e/claude-integration.test.ts
```

### Run with Verbose Output (Recommended)
```bash
npx vitest run tests/e2e/claude-integration.test.ts --reporter=verbose
```

### Run Specific Test Suites
```bash
# Full manual workflow automation
npx vitest run tests/e2e/claude-integration.test.ts -t "Full Manual Workflow"

# Fix-all workflow tests  
npx vitest run tests/e2e/claude-integration.test.ts -t "Fix-All Complete Workflow"

# Error context and configuration tests
npx vitest run tests/e2e/claude-integration.test.ts -t "Real Error Context"
```

## What These Tests Do

### Test 1: Full Manual Workflow Automation
Replicates your manual testing process:
1. Initializes tfq with Claude enabled
2. Runs tests to identify failures
3. Adds failing tests to queue with `--auto-add`
4. Fixes next test using Claude with `fix-next`
5. Verifies the fix actually improves test results
6. Checks queue management and statistics

### Test 2: Fix-All Complete Workflow  
Tests the complete `fix-all` command:
1. Populates queue with multiple failing tests
2. Runs `fix-all` with limited iterations
3. Verifies iterative processing and progress reporting
4. Checks that fixes improve overall test state
5. Validates performance and timeout handling

### Additional Tests
- **Claude timeout handling** - Tests graceful behavior with short timeouts
- **Error context passing** - Verifies real error context reaches Claude
- **Custom configuration** - Tests custom Claude settings and prompts
- **Progress reporting** - Validates user feedback during long operations

## Test Environment

- **Temporary directories** - All tests use OS temp directories for isolation
- **Process cleanup** - Child processes are properly tracked and terminated
- **Example reset** - JavaScript example is reset to buggy state before each test
- **Timeout management** - Tests have appropriate timeouts (2-6 minutes for Claude operations)

## Troubleshooting

### Tests Skip Automatically
If tests show "Claude E2E tests disabled", ensure:
- `TFQ_TEST_CLAUDE=true` environment variable is set
- Claude CLI is installed and in your PATH
- `claude --version` works from your terminal

### Tests Timeout
Claude operations can take time. Consider:
- Using a faster model if available
- Checking your internet connection
- Verifying Claude CLI is working outside of tests

### Example Directory Not Found
If tests skip due to missing examples/javascript:
- Ensure you're running from the tfq project root
- Check that `examples/javascript/` directory exists
- Verify the directory contains test files and package.json

## CI/CD Integration

For automated testing in CI:

```yaml
# In GitHub Actions or similar
- name: Run E2E Claude Tests  
  if: env.CLAUDE_CLI_AVAILABLE == 'true'
  run: |
    export TFQ_TEST_CLAUDE=true
    npm test -- tests/e2e/claude-integration.test.ts
  env:
    CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
```

## Test Output

Successful test runs will show:
- ✅ Manual workflow steps completing
- 🎉 Tests passing after Claude fixes
- 📊 Progress reporting and statistics
- ⏱️  Performance metrics

Failed tests may indicate:
- Claude integration issues
- Configuration problems  
- Test fixture problems
- Timeout issues with slow models

The tests are designed to be informative even when Claude cannot fix the specific test failures, as they verify the integration workflow itself.