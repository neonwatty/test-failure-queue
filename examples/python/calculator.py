"""
Calculator module for basic arithmetic operations.
"""


class DivisionByZeroError(Exception):
    """Custom exception for division by zero."""
    pass


class Calculator:
    """A simple calculator class for basic arithmetic operations."""
    
    def __init__(self):
        """Initialize the calculator with a history of operations."""
        self.history = []
    
    def add(self, a, b):
        """
        Add two numbers.
        
        Args:
            a: First number
            b: Second number
            
        Returns:
            The sum of a and b
        """
        result = a + b
        self.history.append(f"{a} + {b} = {result}")
        return result
    
    def subtract(self, a, b):
        """
        Subtract b from a.
        
        Args:
            a: First number
            b: Second number
            
        Returns:
            The difference of a and b
        """
        result = a - b
        self.history.append(f"{a} - {b} = {result}")
        return result
    
    def multiply(self, a, b):
        """
        Multiply two numbers.
        
        Args:
            a: First number
            b: Second number
            
        Returns:
            The product of a and b
        """
        result = a * b
        self.history.append(f"{a} * {b} = {result}")
        return result
    
    def divide(self, a, b):
        """
        Divide a by b.
        
        Args:
            a: Dividend
            b: Divisor
            
        Returns:
            The quotient of a and b
            
        Raises:
            DivisionByZeroError: If b is zero
        """
        if b == 0:
            raise DivisionByZeroError("Cannot divide by zero")
        result = a / b
        self.history.append(f"{a} / {b} = {result}")
        return result
    
    def clear_history(self):
        """Clear the calculation history."""
        self.history = []
        return []