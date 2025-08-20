# Provider Demonstrations

This directory contains simple demonstration projects showing how TFQ's various providers (like Claude Code SDK) can automatically fix failing tests.

## Prerequisites

1. **Install Claude Code** from [claude.ai/code](https://claude.ai/code)
2. **Authenticate** Claude Code on your system
3. **Install TFQ** globally: `npm install -g tfq`

## Demo Projects

### 1. math-assistant.ts
A standalone TypeScript example showing direct Claude Code SDK usage.

```bash
npx tsx math-assistant.ts
```

### 2. javascript-calculator/
A JavaScript project with intentionally broken calculator functions.

**The Problem:** The calculator's add function incorrectly subtracts instead of adds.

```bash
cd javascript-calculator
npm install
npm test  # See the failing test

# Fix with TFQ
tfq run-tests --auto-add
tfq fix-tests
npm test  # Test should now pass!
```

### 3. python-math-utils/
A Python project with broken math utility functions.

**The Problem:** Various math functions have logic errors.

```bash
cd python-math-utils
pip install -r requirements.txt
pytest  # See failing tests

# Fix with TFQ
tfq run-tests --language python --auto-add
tfq fix-tests
pytest  # Tests should pass!
```

## How It Works

1. **Test Detection**: TFQ runs your tests and detects failures
2. **Queue Management**: Failed tests are added to a persistent queue
3. **AI Analysis**: Claude Code SDK analyzes the test and implementation
4. **Automatic Fixing**: The SDK suggests and applies fixes
5. **Verification**: Tests are re-run to confirm the fix

## Example Fix Session

```bash
$ cd javascript-calculator
$ tfq run-tests --auto-add --priority 5

Running: npm test
==================
FAIL calculator.test.js
  ✗ add function should add two numbers

1 test failed
Added to queue: calculator.test.js

$ tfq fix-tests --verbose

🤖 Starting AI-powered test fixing...
Processing: calculator.test.js
  Reading test file...
  Found related file: calculator.js
  Requesting fix from Claude Code SDK...
  
  Claude: I see the issue. The add function is using subtraction (-) 
          instead of addition (+). Let me fix that.
  
  Applying fix...
  Verifying...
  ✓ Test now passes!

Fix Summary:
✓ Fixed: 1 test
Total time: 2.3s

$ npm test

PASS calculator.test.js
  ✓ add function should add two numbers (2ms)
```

## Creating Your Own Demo

To create a new demo project:

1. Create a simple project with clear test failures
2. Make the bugs obvious and fixable
3. Include a README explaining the scenario
4. Test that TFQ can successfully fix it

Example structure:
```
my-demo/
├── README.md         # Explain the demo
├── package.json      # Dependencies and test script
├── index.js          # Implementation with bugs
└── index.test.js     # Tests that reveal the bugs
```

## Tips for Best Results

1. **Clear Test Names**: Use descriptive test names that explain expected behavior
2. **Simple Bugs**: Start with obvious logic errors (wrong operators, off-by-one errors)
3. **Good Error Messages**: Tests should have clear assertion messages
4. **Isolated Functions**: Each function should have a single responsibility

## Troubleshooting

If fixes aren't working:

1. **Check Claude Code**: Ensure it's running and authenticated
2. **Verbose Mode**: Use `tfq fix-tests --verbose` for detailed output
3. **Dry Run**: Try `tfq fix-tests --dry-run` to preview without changes
4. **Simple Cases First**: Start with the simplest failing test

## Learn More

- [TFQ Documentation](../../README.md)
- [Claude Code SDK Setup](../../docs/CLAUDE_CODE_SETUP.md)
- [Provider Tests](../../tests/providers/)