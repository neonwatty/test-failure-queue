#!/bin/bash

echo "🔄 Resetting Python Calculator to state with test failures..."

# Note: The calculator.py is mostly correct, but the tests have intentional failures
# We'll keep calculator.py as is, since the test failures are in the test file itself

# Ensure calculator.py is in the correct state
cat > calculator.py << 'EOF'
"""
A simple calculator class for demonstration purposes.
"""

class DivisionByZeroError(Exception):
    """Custom exception for division by zero."""
    pass


class Calculator:
    """A simple calculator with basic operations."""
    
    def __init__(self):
        """Initialize calculator with empty history."""
        self.history = []
    
    def add(self, a, b):
        """Add two numbers and store in history."""
        result = a + b
        self.history.append(f"add({a}, {b}) = {result}")
        return result
    
    def subtract(self, a, b):
        """Subtract b from a and store in history."""
        result = a - b
        self.history.append(f"subtract({a}, {b}) = {result}")
        return result
    
    def multiply(self, a, b):
        """Multiply two numbers and store in history."""
        result = a * b
        self.history.append(f"multiply({a}, {b}) = {result}")
        return result
    
    def divide(self, a, b):
        """Divide a by b and store in history."""
        if b == 0:
            raise DivisionByZeroError("Cannot divide by zero")
        result = a / b
        self.history.append(f"divide({a}, {b}) = {result}")
        return result
    
    def clear_history(self):
        """Clear the calculation history."""
        self.history = []
EOF

echo "✅ calculator.py is set correctly"

# Clear TFQ queue for this demo
echo "🧹 Clearing TFQ queue..."
../../../bin/tfq clear 2>/dev/null || true

echo "✅ Reset complete!"
echo ""
echo "The test file test_advanced.py contains intentional failures:"
echo "  1. test_float_precision_issue - expects exact 0.3 from 0.1 + 0.2"
echo "  2. test_division_by_zero_wrong_exception - expects ValueError instead of DivisionByZeroError"
echo "  3. test_many_operations_performance - unrealistic time constraint (< 0.001s)"
echo "  4. test_history_memory_limit - expects history to auto-clear but it doesn't"
echo ""
echo "You can now run the demo:"
echo "  ./demo.sh                    # Run the full demo"
echo "  pytest test_advanced.py -v   # See failing tests"