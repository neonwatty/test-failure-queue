"""
Test suite for Calculator class using pytest.
"""

import pytest
from calculator import Calculator, DivisionByZeroError


@pytest.fixture
def calculator():
    """Fixture to provide a fresh Calculator instance for each test."""
    return Calculator()


class TestBasicOperations:
    """Test basic calculator operations."""
    
    def test_addition(self, calculator):
        """Test addition of two numbers - PASSES."""
        assert calculator.add(2, 3) == 5
        assert calculator.add(-1, 1) == 0
        assert calculator.add(0, 0) == 0
    
    def test_subtraction(self, calculator):
        """Test subtraction of two numbers - PASSES."""
        assert calculator.subtract(5, 3) == 2
        assert calculator.subtract(0, 5) == -5
        assert calculator.subtract(-3, -3) == 0
    
    def test_multiplication(self, calculator):
        """Test multiplication of two numbers - PASSES."""
        assert calculator.multiply(3, 4) == 12
        assert calculator.multiply(-2, 3) == -6
        assert calculator.multiply(0, 100) == 0
    
    def test_division_wrong_result(self, calculator):
        """Test division with wrong expected result - FAILS."""
        # This test intentionally fails to demonstrate TFQ
        assert calculator.divide(10, 2) == 3  # Should be 5, not 3
    
    def test_complex_calculation_error(self, calculator):
        """Test complex calculation with error - FAILS."""
        # This test intentionally fails
        result = calculator.add(10, 5)
        result = calculator.multiply(result, 2)
        result = calculator.subtract(result, 10)
        assert result == 15  # Should be 20, not 15


@pytest.mark.parametrize("a,b,expected", [
    (10, 5, 15),
    (0, 0, 0),
    (-5, 5, 0),
    (100, 200, 300),
    (1.5, 2.5, 4.0)
])
def test_parametrized_addition(calculator, a, b, expected):
    """Test addition with multiple parameter sets - PASSES."""
    assert calculator.add(a, b) == expected


@pytest.mark.parametrize("a,b,expected", [
    (10, 2, 5),
    (20, 4, 5),
    (15, 3, 5),
    (100, 20, 5)
])
def test_parametrized_division(calculator, a, b, expected):
    """Test division with multiple parameter sets - PASSES."""
    assert calculator.divide(a, b) == expected


def test_history_tracking(calculator):
    """Test that operations are tracked in history - PASSES."""
    calculator.add(2, 3)
    calculator.subtract(10, 5)
    calculator.multiply(3, 4)
    
    assert len(calculator.history) == 3
    assert "2 + 3 = 5" in calculator.history
    assert "10 - 5 = 5" in calculator.history
    assert "3 * 4 = 12" in calculator.history


def test_clear_history(calculator):
    """Test clearing calculation history - PASSES."""
    calculator.add(1, 1)
    calculator.multiply(2, 2)
    assert len(calculator.history) == 2
    
    calculator.clear_history()
    assert len(calculator.history) == 0