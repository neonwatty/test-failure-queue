# Ruby Calculator with Minitest

A demonstration Ruby project showcasing Minitest testing framework integration with Test Failure Queue (TFQ).

## Project Structure

```
ruby/
├── lib/
│   └── calculator.rb       # Calculator class implementation
├── test/
│   ├── test_helper.rb      # Minitest configuration and helpers
│   ├── calculator_test.rb  # Main calculator tests
│   └── edge_cases_test.rb  # Edge case tests
├── Gemfile                  # Ruby dependencies
└── .tfqrc                   # TFQ configuration for Minitest
```

## Requirements

- Ruby >= 2.5.0
- Bundler gem installed (`gem install bundler`)

## Setup

Install dependencies:

```bash
bundle install
```

## Running Tests

### Standard Minitest Execution

Run all tests:
```bash
ruby -Ilib:test test/**/*_test.rb
```

Or using bundler:
```bash
bundle exec ruby -Ilib:test test/**/*_test.rb
```

Run specific test file:
```bash
ruby -Ilib:test test/calculator_test.rb
```

### Using Test Failure Queue (TFQ)

#### Local TFQ (from repository root)

Auto-detect language and framework:
```bash
../../../bin/tfq run-tests --auto-detect
```

Explicitly specify Minitest:
```bash
../../../bin/tfq run-tests --language ruby --framework minitest
```

List available frameworks:
```bash
../../../bin/tfq run-tests --list-frameworks --language ruby
```

#### Global TFQ (if installed via npm)

```bash
npm install -g tfq
tfq run-tests --auto-detect
```

## Test Implementation Details

### Calculator Class Features

The `Calculator` class implements:
- Basic arithmetic operations (add, subtract, multiply, divide)
- Advanced operations (power, square_root, factorial)
- Statistical operations (average)
- Error handling for edge cases

### Test Structure

**calculator_test.rb**: Main functionality tests
- 25+ test cases covering all calculator methods
- 2 intentionally failing tests to demonstrate TFQ queue management
- Uses Minitest assertions and test helpers

**edge_cases_test.rb**: Boundary and edge case testing  
- Division by zero handling
- Type coercion scenarios
- Overflow/underflow conditions
- 5 intentionally failing tests for TFQ demonstration

### Ruby Idioms and Patterns

- Uses Ruby's built-in `**` operator for exponentiation
- Leverages `reduce` for factorial calculation
- Implements guard clauses for input validation
- Uses `to_f` for explicit float conversion
- Follows Ruby naming conventions (snake_case methods)

## Minitest Features Demonstrated

- Test class inheritance from `Minitest::Test`
- Setup method for test initialization
- Various assertion methods:
  - `assert_equal` for exact matches
  - `assert_in_delta` for floating-point comparisons
  - `assert_raises` for exception testing
  - `assert_instance_of` for type checking
- Custom test helpers in `test_helper.rb`
- Minitest reporters for enhanced output formatting

## TFQ Configuration

The `.tfqrc` file configures TFQ for Minitest:
```json
{
  "language": "ruby",
  "framework": "minitest",
  "testCommand": "ruby -Ilib:test test/**/*_test.rb",
  "testPattern": "test/**/*_test.rb",
  "failurePattern": "\\d+\\) (Error|Failure):",
  "priority": 1,
  "maxRetries": 3,
  "timeout": 30000
}
```

## Workflow Example

1. Run tests to see failures:
```bash
ruby -Ilib:test test/**/*_test.rb
# Shows 7 failures across both test files
```

2. Queue failures with TFQ:
```bash
../../bin/tfq run-tests --auto-detect
# TFQ captures and queues the 7 failing tests
```

3. View queued failures:
```bash
../../bin/tfq show
```

4. Fix a test and rerun:
```bash
# Edit test file to fix assertion
../../bin/tfq run-next
# TFQ runs the highest priority failure
```

5. Clear resolved failures:
```bash
../../bin/tfq clear --resolved
```

## Test Output Example

```
Run options: --seed 12345

# Running:

CalculatorTest#test_add_returns_sum_of_two_numbers [PASS]
CalculatorTest#test_subtract_incorrectly_expects_wrong_result [FAIL]
  Expected: 60
  Actual: 50

EdgeCasesTest#test_division_expects_exact_fraction [FAIL]
  Expected: (1/3)
  Actual: 0.3333333333333333

Finished in 0.015625s, 2880.0000 runs/s, 3200.0000 assertions/s.

45 runs, 50 assertions, 7 failures, 0 errors, 0 skips
```

## Debugging Tips

- Use `puts` or `p` to inspect values during test runs
- Add `--verbose` flag for more detailed output
- Use `byebug` gem for interactive debugging
- Check test isolation with `--seed` option
- Review test helper methods for common assertions