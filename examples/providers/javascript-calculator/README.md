# JavaScript Calculator - TFQ Claude Code Demo

This demonstration shows the complete TFQ workflow: detecting test failures, managing them in a queue, and using Claude Code to automatically fix the bugs.

## Prerequisites

1. **Install Claude Code Desktop App**
   - Download from [claude.ai/code](https://claude.ai/code)
   - Sign in and authenticate

2. **Install TFQ** (if not already installed)
   ```bash
   npm install -g tfq
   ```

3. **Install Project Dependencies**
   ```bash
   npm install
   ```

## The Intentional Bugs

This calculator contains several bugs that cause tests to fail:

1. **Addition Bug**: `add()` returns `a - b` instead of `a + b`
2. **Multiplication Bug**: `multiply()` returns `a + b` instead of `a * b`  
3. **Division Bug**: `divide()` doesn't handle division by zero
4. **Power Bug**: `power()` returns `a * b` instead of using `Math.pow()`

## Step-by-Step Demo

### Step 1: See the Failing Tests

```bash
npm test
```

**Expected Output:**
```
FAIL  ./calculator.test.js
  Calculator
    add
      ✕ should add two positive numbers
      ✕ should add positive and negative numbers
      ✕ should add two negative numbers
      ✕ should handle zero
    multiply
      ✕ should multiply two positive numbers
      ✕ should multiply positive and negative
      ✕ should multiply decimals
    divide
      ✕ should throw error when dividing by zero
    power
      ✕ should calculate power of positive numbers
      ✕ should calculate power with zero exponent
      ✕ should calculate power with negative exponent
```

### Step 2: Detect Failures with TFQ

```bash
# Run tests and automatically add failures to the queue
tfq run-tests --auto-detect --auto-add --priority 5
```

**Expected Output:**
```
🔍 Auto-detecting language and framework...
  Language: javascript
  Framework: jest

Running: npm test
==================
FAIL calculator.test.js
  - add › should add two positive numbers
  - add › should add positive and negative numbers
  [... more failures ...]

📊 Test Results:
  Total: 20 tests
  Passed: 3 tests
  Failed: 17 tests

✅ Added to queue: calculator.test.js (priority: 5)
```

### Step 3: View the Queue

```bash
tfq list
```

**Expected Output:**
```
📋 Test Failure Queue (1 file):

1. calculator.test.js
   Priority: 5 | Retries: 0
   Added: 2025-01-20 10:30:00
```

### Step 4: Preview Fixes (Dry Run)

```bash
tfq fix-tests --dry-run --verbose
```

This shows what TFQ would fix without making changes.

### Step 5: Apply Claude Code Fixes

```bash
tfq fix-tests --verbose
```

**Expected Output:**
```
🤖 Starting AI-powered test fixing...
ℹ Using Claude Code SDK provider

Processing: calculator.test.js
  📖 Reading test file...
  🔍 Analyzing test failures...
  📚 Found related files:
     - calculator.js
  
  🧠 Requesting fix from Claude Code...
  
  Claude: I can see several issues in the calculator.js file:
  1. The add function uses subtraction (-) instead of addition (+)
  2. The multiply function uses addition (+) instead of multiplication (*)
  3. The divide function doesn't handle division by zero
  4. The power function uses multiplication instead of Math.pow()
  
  Let me fix these issues...
  
  ✏️ Applying fixes to calculator.js...
  ✅ Changes applied successfully
  
  🧪 Verifying fix...
  Running: npm test
  ✅ All tests now pass!

📊 Fix Summary:
  ✅ Fixed: 1 file (calculator.test.js)
  📝 Files modified: calculator.js
  ⏱️ Time: 3.2s
```

### Step 6: Verify All Tests Pass

```bash
npm test
```

**Expected Output:**
```
PASS  ./calculator.test.js
  Calculator
    ✓ add (4 tests)
    ✓ subtract (3 tests)
    ✓ multiply (4 tests)
    ✓ divide (4 tests)
    ✓ power (4 tests)

Test Suites: 1 passed, 1 total
Tests:       19 passed, 19 total
```

## 🔄 Reset the Demo

To reset the files to their original buggy state:

```bash
./reset.sh
```

## 📝 Additional TFQ Commands

```bash
# View queue statistics
tfq stats

# Remove a file from the queue
tfq remove calculator.test.js

# Clear the entire queue
tfq clear

# Search for files in the queue
tfq search "*.test.js"

# Get the next file from queue (removes it)
tfq next

# Peek at the next file (doesn't remove)
tfq peek
```

## 🎯 Learning Objectives

This demo demonstrates:

1. **Test Failure Detection** - TFQ automatically identifies failing tests
2. **Queue Management** - Failed tests are tracked in a persistent queue
3. **AI-Powered Fixing** - Claude Code analyzes and fixes the code
4. **Verification** - Tests are re-run to confirm fixes work
5. **Complete Workflow** - From failure to fix in a few commands

## 💡 Tips

- Use `--verbose` to see detailed Claude Code interactions
- Use `--dry-run` to preview changes before applying
- Use `--priority` to control fix order for multiple failures
- The queue persists between sessions (stored in `~/.tfq/queue.db`)

## 🔧 Troubleshooting

If fixes aren't working:

1. **Check Claude Code is running**: The desktop app should be open
2. **Verify authentication**: You should be signed into Claude Code
3. **Try verbose mode**: Add `--verbose` to see detailed output
4. **Check the queue**: Use `tfq list` to see queued failures
5. **Reset and retry**: Use `./reset.sh` to start fresh