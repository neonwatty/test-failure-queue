# TFQ AI Fix Demo: JavaScript Calculator

This is a demonstration project showing how TFQ's AI-powered test fixing works.

## The Demo

This project contains:
- `calculator.js` - A calculator with intentional bugs
- `calculator.test.js` - Tests that will fail due to the bugs
- `package.json` - Jest configuration

## Running the Demo

### Prerequisites

1. Make sure you have TFQ installed:
   ```bash
   npm install -g tfq
   ```

2. Set your Anthropic API key:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key-here"
   ```

### Step 1: Run Tests and See Failures

```bash
cd examples/javascript-calculator
npm install
npm test
```

You should see test failures because the calculator has bugs.

### Step 2: Use TFQ to Detect and Queue Failures

```bash
# Auto-detect language/framework and add failures to queue
tfq run-tests --auto-detect --auto-add
```

### Step 3: Preview AI Fixes (Dry Run)

```bash
# See what the AI would fix without making changes
tfq fix-tests --dry-run --verbose
```

### Step 4: Apply AI Fixes

```bash
# Let the AI fix the failing tests
tfq fix-tests --verbose
```

### Step 5: Verify Fixes

```bash
# Run tests again to see if they pass
npm test
```

## The Bugs

The calculator intentionally contains these bugs that the AI should detect and fix:

1. **Addition Bug**: `add()` function returns `a - b` instead of `a + b`
2. **Multiplication Bug**: `multiply()` function returns `a + b` instead of `a * b`
3. **Division Bug**: `divide()` function doesn't handle division by zero

## Expected AI Fixes

The AI should:
1. Fix the addition function to use `+` instead of `-`
2. Fix the multiplication function to use `*` instead of `+`
3. Add proper error handling for division by zero

## Learning Objectives

This demo shows:
- How TFQ detects failing tests automatically
- How AI analyzes test failures and related source code
- How fixes are applied safely with verification
- Cost tracking and token usage monitoring
- The complete AI-powered debugging workflow