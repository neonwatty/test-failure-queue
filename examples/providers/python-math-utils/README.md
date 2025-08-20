# TFQ AI Fix Demo: Python Math Utils

This is a demonstration project showing how TFQ's AI-powered test fixing works with Python.

## The Demo

This project contains:
- `math_utils.py` - Math utilities with intentional bugs
- `test_math_utils.py` - Pytest tests that will fail due to the bugs
- `requirements.txt` - Dependencies

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

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Step 1: Run Tests and See Failures

```bash
cd examples/python-math-utils
pytest -v
```

You should see test failures because the math utilities have bugs.

### Step 2: Use TFQ to Detect and Queue Failures

```bash
# Auto-detect Python/pytest and add failures to queue
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
pytest -v
```

## The Bugs

The math utilities intentionally contain these bugs:

1. **Factorial Bug**: Doesn't handle the base case correctly
2. **Prime Check Bug**: Has off-by-one errors in the logic
3. **GCD Bug**: Incorrect algorithm implementation
4. **Fibonacci Bug**: Wrong recursive formula

## Expected AI Fixes

The AI should:
1. Fix the factorial base case
2. Correct the prime number checking logic
3. Implement the correct GCD algorithm
4. Fix the Fibonacci recursive formula

## Learning Objectives

This demo shows:
- Multi-language support (Python after JavaScript)
- How TFQ adapts to different test frameworks (pytest vs Jest)
- AI's ability to understand Python-specific syntax and patterns
- Cross-language consistency in the fixing workflow