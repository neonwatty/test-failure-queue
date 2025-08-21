# Core Integration Test Projects

This directory contains test projects used by TFQ's integration test suite to verify core functionality across different languages and frameworks.

## Purpose

These projects are **NOT** meant for demonstrating Claude Code AI features. Instead, they:
- Test TFQ's core queue management functionality
- Verify multi-language support
- Ensure proper test detection and parsing
- Validate framework auto-detection

## Projects

### JavaScript (`javascript/`)
- **Framework**: Jest
- **Tests**: Calculator functions with intentional failures
- **Purpose**: Verify JavaScript/Jest integration

### Python (`python/`)
- **Framework**: pytest
- **Tests**: Calculator and advanced math functions
- **Purpose**: Verify Python/pytest integration

### Ruby (`ruby/`)
- **Framework**: Minitest
- **Tests**: Calculator with edge cases
- **Purpose**: Verify Ruby/Minitest integration

### Rails 8 (`rails8/`)
- **Framework**: Minitest (Rails)
- **Tests**: User model and controller tests
- **Purpose**: Verify Rails application support

### TypeScript (`typescript/`)
- **Framework**: Vitest
- **Tests**: TypeScript calculator with type checking
- **Purpose**: Verify TypeScript/Vitest integration

## Usage in Tests

These projects are automatically used by the integration test suite:

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm test tests/integration/examples-integration.test.ts
```

## Test Scenarios

Each project includes:
1. **Passing tests** - To verify successful test detection
2. **Failing tests** - To verify failure detection and queue management
3. **Multiple test files** - To test batch processing
4. **Various error types** - To test error parsing

## Important Notes

⚠️ **Do NOT modify these projects** unless updating integration tests
- The tests expect specific failures and outputs
- Changes may break the integration test suite
- Each project is carefully crafted for testing specific scenarios

## Adding New Test Projects

If adding a new language/framework:

1. Create a minimal project with clear test structure
2. Include both passing and failing tests
3. Document the expected failures
4. Add corresponding integration tests in `tests/integration/`
5. Update the auto-detection logic if needed

Example structure:
```
new-language/
├── README.md           # Document the test scenarios
├── package.json        # Or equivalent dependency file
├── src/               # Implementation files
│   └── calculator.ext
└── tests/             # Test files with failures
    └── calculator.test.ext
```

## Running Projects Individually

To manually test a project:

```bash
cd examples/core/javascript
npm install
npm test

# Use TFQ to detect failures
tfq run-tests --auto-detect
tfq list
```

## Related

- [Integration Tests](../../tests/integration/)
- [Provider Demos](../providers/) - For AI feature demonstrations
- [Configuration Examples](../configs/) - Sample configuration files