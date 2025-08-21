# TFQ Examples

This directory contains example projects and demonstrations for TFQ (Test Failure Queue).

## Directory Structure

### `/core/`
**Core Integration Test Projects** - Full-featured test projects used by TFQ's integration test suite to verify core functionality across different languages and frameworks.

- `javascript/` - JavaScript project with Jest tests

These projects contain intentionally failing tests to verify TFQ's ability to:
- Detect test failures
- Parse error output
- Manage the failure queue
- Work with different test frameworks

### `/providers/`
**Provider Demonstrations** - Simple projects demonstrating TFQ's AI-powered test fixing capabilities using various providers like Claude Code SDK.

- `math-assistant.ts` - Basic example showing Claude Code SDK usage
- `javascript-calculator/` - JavaScript project with failing calculator tests
- `python-math-utils/` - Python project with failing math utility tests

These demos are designed to:
- Show how TFQ can automatically fix failing tests
- Demonstrate the Claude Code SDK integration
- Provide simple, understandable test scenarios

### `/configs/`
**Configuration Examples** - Sample `.tfqrc` configuration files for different languages and setups.

- `javascript.tfqrc` - JavaScript/Node.js configuration
- `python.tfqrc` - Python configuration
- `ruby.tfqrc` - Ruby configuration
- `multi-language.tfqrc` - Multi-language project configuration

## Usage

### Running Integration Tests

The projects in `/core/` are automatically used by TFQ's test suite:

```bash
npm run test:integration
```

### Testing Providers

To test the AI-powered test fixing with projects in `/providers/`:

1. Ensure Claude Code is installed and authenticated
2. Navigate to a demo project:
   ```bash
   cd examples/providers/javascript-calculator
   ```
3. Run tests to see failures:
   ```bash
   npm test
   ```
4. Use TFQ to fix the tests:
   ```bash
   tfq run-tests --auto-add
   tfq fix-tests
   ```

### Using Configuration Examples

Copy a configuration file to your project root and customize:

```bash
cp examples/configs/javascript.tfqrc .tfqrc
```

## Creating Your Own Examples

### For Core Integration Testing
Add projects to `/core/` that:
- Have clear test failures
- Use standard test frameworks
- Include both passing and failing tests
- Are minimal but realistic

### For Provider Demos
Add projects to `/providers/` that:
- Have simple, fixable test failures
- Demonstrate specific fixing scenarios
- Are easy to understand
- Show the power of AI-assisted fixing