# Python Calculator with pytest Testing

A simple calculator implementation in Python with comprehensive pytest test coverage, designed to demonstrate the Test Failure Queue (TFQ) tool's capabilities.

## Project Description

This project implements a basic Calculator class with arithmetic operations (add, subtract, multiply, divide) and includes both passing and intentionally failing tests to showcase TFQ's test failure management features.

## Setup Instructions

### 1. Create Virtual Environment

```bash
python -m venv venv
```

### 2. Activate Virtual Environment

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

## Running Tests

### Basic Test Execution

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest test_calculator.py

# Run with coverage report
pytest --cov=calculator

# Run excluding stress tests
pytest -m "not stress"
```

## Using Test Failure Queue (TFQ)

### Local TFQ Installation

If you're working from the TFQ repository:

```bash
# Run tests with auto-detection
../../../bin/tfq run-tests --auto-detect

# Explicitly specify language and framework
../../../bin/tfq run-tests --language python --framework pytest

# Show current queue status
../../../bin/tfq show

# Process failed tests from queue
../../../bin/tfq dequeue
```

### NPM Global Installation

If TFQ is installed globally via npm:

```bash
# Install globally (one-time setup)
npm install -g tfq

# Run tests
tfq run-tests --auto-detect

# Or with explicit configuration
tfq run-tests --language python --framework pytest
```

## Test Structure

### `test_calculator.py`
- **Passing Tests (7):**
  - Basic arithmetic operations (add, subtract, multiply)
  - Parametrized addition tests
  - Parametrized division tests
  - History tracking
  - Clear history functionality

- **Failing Tests (2):**
  - `test_division_wrong_result`: Expects wrong division result
  - `test_complex_calculation_error`: Complex calculation with incorrect assertion

### `test_advanced.py`
- **Passing Tests (7):**
  - Division by zero exception handling
  - Very large number operations
  - Negative number operations
  - Mixed integer/float operations
  - Complex calculation workflow
  - Multiple zero division attempts

- **Failing Tests (4):**
  - `test_division_by_zero_wrong_exception`: Expects wrong exception type
  - `test_float_precision_issue`: Float precision comparison
  - `test_many_operations_performance`: Unrealistic performance expectation
  - `test_history_memory_limit`: History size constraint

- **Special Tests:**
  - Skipped test: `test_power_operation` (not implemented)
  - Expected failure: `test_float_arithmetic_precision` (marked with xfail)

## Python Testing Patterns

### Using pytest Fixtures
```python
@pytest.fixture
def calculator():
    return Calculator()

def test_addition(calculator):
    assert calculator.add(2, 3) == 5
```

### Parametrized Testing
```python
@pytest.mark.parametrize("a,b,expected", [
    (10, 5, 15),
    (0, 0, 0),
    (-5, 5, 0)
])
def test_parametrized_addition(calculator, a, b, expected):
    assert calculator.add(a, b) == expected
```

### Exception Testing
```python
with pytest.raises(DivisionByZeroError):
    calculator.divide(10, 0)
```

### Custom Markers
```python
@pytest.mark.stress
def test_performance():
    # Stress test implementation
```

## TFQ Workflow Example

1. **Initial Test Run:**
```bash
$ ../../bin/tfq run-tests --auto-detect
Running tests for Python (pytest)...
Found 6 test failures
Added to queue: test_calculator.py::TestBasicOperations::test_division_wrong_result
Added to queue: test_calculator.py::TestBasicOperations::test_complex_calculation_error
Added to queue: test_advanced.py::TestExceptionHandling::test_division_by_zero_wrong_exception
Added to queue: test_advanced.py::TestEdgeCases::test_float_precision_issue
Added to queue: test_advanced.py::TestStressScenarios::test_many_operations_performance
Added to queue: test_advanced.py::TestStressScenarios::test_history_memory_limit
```

2. **Check Queue Status:**
```bash
$ ../../bin/tfq show
Test Failure Queue Status:
┌─────────────────────────────────────────────────┬──────────┬───────────┐
│ Test                                            │ Priority │ Retries   │
├─────────────────────────────────────────────────┼──────────┼───────────┤
│ test_calculator.py::test_division_wrong_result │ 10       │ 0         │
│ test_calculator.py::test_complex_calculation   │ 10       │ 0         │
│ test_advanced.py::test_float_precision_issue   │ 10       │ 0         │
└─────────────────────────────────────────────────┴──────────┴───────────┘
```

3. **Process Failed Tests:**
```bash
$ ../../bin/tfq dequeue
Processing: test_calculator.py::test_division_wrong_result
Test still failing after retry
```

## Coverage Report Example

```bash
$ pytest --cov=calculator --cov-report=term-missing
========================= test session starts =========================
collected 20 tests

test_calculator.py ........F.F...                                  [ 70%]
test_advanced.py ...F.F.FF.x.s                                    [100%]

---------- coverage: platform darwin, python 3.x.x ----------
Name           Stmts   Miss  Cover   Missing
----------------------------------------------
calculator.py     25      0   100%
----------------------------------------------
TOTAL             25      0   100%
```

## Configuration

The project includes a `.tfqrc` configuration file that sets:
- Default language: Python
- Default framework: pytest
- Test command: `pytest -v`
- Test pattern: `test_*.py`
- Priority: 10
- Max retries: 3

This configuration is automatically detected when using `--auto-detect` flag with TFQ.