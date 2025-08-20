"""
Advanced test scenarios for Calculator class.
"""

import pytest
import sys
from calculator import Calculator, DivisionByZeroError


@pytest.fixture
def calculator():
    """Fixture to provide a fresh Calculator instance for each test."""
    return Calculator()


class TestExceptionHandling:
    """Test exception handling scenarios."""
    
    def test_division_by_zero_raises_exception(self, calculator):
        """Test that dividing by zero raises custom exception - PASSES."""
        with pytest.raises(DivisionByZeroError) as exc_info:
            calculator.divide(10, 0)
        assert str(exc_info.value) == "Cannot divide by zero"
    
    def test_division_by_zero_wrong_exception(self, calculator):
        """Test division by zero with wrong exception type - FAILS."""
        # This test intentionally fails - expecting wrong exception type
        with pytest.raises(ValueError):  # Should be DivisionByZeroError
            calculator.divide(5, 0)
    
    def test_multiple_zero_divisions(self, calculator):
        """Test multiple zero division attempts - PASSES."""
        for num in [1, 10, -5, 100]:
            with pytest.raises(DivisionByZeroError):
                calculator.divide(num, 0)


class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_very_large_numbers(self, calculator):
        """Test operations with very large numbers - PASSES."""
        large_num1 = 10**100
        large_num2 = 10**100
        
        assert calculator.add(large_num1, large_num2) == 2 * (10**100)
        assert calculator.multiply(10**50, 10**50) == 10**100
    
    def test_negative_numbers(self, calculator):
        """Test operations with negative numbers - PASSES."""
        assert calculator.add(-10, -20) == -30
        assert calculator.subtract(-10, -20) == 10
        assert calculator.multiply(-5, -3) == 15
        assert calculator.divide(-20, -4) == 5
    
    def test_float_precision_issue(self, calculator):
        """Test float precision - FAILS due to float arithmetic."""
        # This test intentionally fails due to float precision
        result = calculator.add(0.1, 0.2)
        assert result == 0.3  # Will fail due to float precision (0.30000000000000004)
    
    def test_mixed_int_float(self, calculator):
        """Test operations with mixed integer and float - PASSES."""
        assert calculator.add(5, 2.5) == 7.5
        assert calculator.multiply(10, 0.5) == 5.0
        assert calculator.divide(7, 2) == 3.5


@pytest.mark.stress
class TestStressScenarios:
    """Stress tests for the calculator."""
    
    def test_many_operations_performance(self, calculator):
        """Test performance with many operations - FAILS (deliberately slow)."""
        # This test deliberately fails by asserting wrong time constraint
        import time
        start = time.time()
        
        for i in range(10000):
            calculator.add(i, i)
            calculator.multiply(i, 2)
            calculator.subtract(i * 2, i)
        
        elapsed = time.time() - start
        # Deliberately strict time constraint to make it fail
        assert elapsed < 0.001  # Unrealistic expectation - will fail
    
    def test_history_memory_limit(self, calculator):
        """Test history doesn't grow indefinitely - FAILS."""
        # Add many operations
        for i in range(1000):
            calculator.add(i, i)
        
        # This test fails - we expect history to auto-clear but it doesn't
        assert len(calculator.history) <= 100  # Will fail as history keeps growing


@pytest.mark.integration
def test_complex_calculation_workflow(calculator):
    """Test a complex calculation workflow - PASSES."""
    # Calculate: ((10 + 5) * 3 - 15) / 3 = 10
    result = calculator.add(10, 5)
    result = calculator.multiply(result, 3)
    result = calculator.subtract(result, 15)
    result = calculator.divide(result, 3)
    
    assert result == 10
    assert len(calculator.history) == 4


@pytest.mark.skip(reason="Not implemented yet")
def test_power_operation(calculator):
    """Test power operation - SKIPPED."""
    # This would test calculator.power(2, 3) == 8
    pass


@pytest.mark.xfail(reason="Known float precision issue")
def test_float_arithmetic_precision(calculator):
    """Test that demonstrates known float precision issues - XFAIL."""
    result = 0
    for _ in range(10):
        result = calculator.add(result, 0.1)
    assert result == 1.0  # May fail due to float precision