# TypeScript Calculator with Vitest Testing

A TypeScript calculator implementation with comprehensive Vitest test coverage, designed to demonstrate the Test Failure Queue (TFQ) library with TypeScript projects.

## Features

- **TypeScript Calculator Class**: Fully typed calculator with basic and advanced operations
- **Interface-based Design**: Implements `CalculatorOperations` interface for type safety
- **Comprehensive Test Suite**: Multiple test files with both passing and intentionally failing tests
- **Vitest Integration**: Modern, fast testing framework with TypeScript support
- **TFQ Integration**: Configured to work with the Test Failure Queue for managing test failures

## Project Structure

```
typescript/
├── src/
│   └── calculator.ts        # TypeScript calculator implementation
├── tests/
│   ├── calculator.test.ts   # Main test suite (includes 2 failing tests)
│   └── edge-cases.test.ts   # Edge case tests (includes 2 failing tests)
├── package.json             # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Vitest test configuration
└── .tfqrc                  # TFQ configuration
```

## Setup

Install dependencies:

```bash
npm install
```

## Running Tests

### Standard Test Execution

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Build TypeScript files
npm run build

# Type-check without building
npm run typecheck
```

### Using TFQ (Test Failure Queue)

#### Using Local TFQ

From this directory, run the TFQ CLI from the project root:

```bash
# Run tests and capture failures
../../../bin/tfq run-tests

# View captured failures
../../../bin/tfq show

# Process the failure queue
../../../bin/tfq dequeue
```

#### Using Global TFQ

If you have TFQ installed globally:

```bash
# Install TFQ globally
npm install -g tfq

# Run tests and capture failures
tfq run-tests

# Auto-detect language and framework
tfq run-tests --auto-detect

# Explicitly specify framework
tfq run-tests --language javascript --framework vitest
```

## Intentional Test Failures

This project includes 4 intentional test failures to demonstrate TFQ functionality:

1. **calculator.test.ts**:
   - Division test expecting wrong result (expects 3 instead of 5)
   - Complex division expecting integer instead of float

2. **edge-cases.test.ts**:
   - Division by zero expecting Infinity (throws error instead)
   - Square root of negative expecting NaN (throws error instead)

## TypeScript-Specific Features

### Type Safety
- All calculator methods are strongly typed
- Interface implementation ensures contract compliance
- Strict mode enabled in `tsconfig.json`

### Error Handling
- Proper error throwing for invalid operations
- Type-safe error messages
- Runtime validation for edge cases

### Configuration
- ES2020 target for modern JavaScript features
- Strict TypeScript checks enabled
- Path aliases configured for clean imports

## Workflow Example

1. **Run tests to see failures**:
   ```bash
   npm test
   ```

2. **Capture failures with TFQ**:
   ```bash
   ../../../bin/tfq run-tests
   ```

3. **View the failure queue**:
   ```bash
   ../../../bin/tfq show
   ```

4. **Fix a test and rerun**:
   ```bash
   # Edit tests/calculator.test.ts to fix a failure
   ../../../bin/tfq dequeue
   ```

5. **Check TypeScript types**:
   ```bash
   npm run typecheck
   ```

## Development Tips

- The `.tfqrc` file configures TFQ to use Vitest by default
- TypeScript compilation errors will be caught before tests run
- Use `npm run test:watch` for TDD workflow
- Type annotations help catch errors at compile time

## Troubleshooting

If you encounter TypeScript errors:
1. Ensure all dependencies are installed: `npm install`
2. Check TypeScript version: `npx tsc --version`
3. Verify tsconfig.json paths are correct
4. Run `npm run typecheck` to see type errors

If tests don't run:
1. Check that Vitest is installed: `npm ls vitest`
2. Verify test file patterns in `vitest.config.ts`
3. Ensure TypeScript files compile: `npm run build`