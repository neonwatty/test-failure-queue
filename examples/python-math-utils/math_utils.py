"""
Math utilities with intentional bugs for TFQ AI fixing demo
"""

def factorial(n):
    """Calculate factorial of n"""
    if n == 0:
        # BUG: Should return 1, not 0
        return 0
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    return n * factorial(n - 1)

def is_prime(n):
    """Check if n is a prime number"""
    if n < 2:
        return False
    
    # BUG: Should go up to sqrt(n), not n-1
    for i in range(2, n - 1):
        if n % i == 0:
            return False
    return True

def gcd(a, b):
    """Calculate greatest common divisor using Euclidean algorithm"""
    # BUG: Incorrect implementation of GCD algorithm
    while b:
        a, b = b, a + b  # Should be a % b, not a + b
    return a

def fibonacci(n):
    """Calculate nth Fibonacci number"""
    if n <= 1:
        return n
    # BUG: Should be fibonacci(n-1) + fibonacci(n-2)
    return fibonacci(n-1) * fibonacci(n-2)

def power(base, exponent):
    """Calculate base raised to the power of exponent"""
    if exponent == 0:
        return 1
    if exponent < 0:
        # BUG: Should handle negative exponents properly
        return base ** exponent
    
    result = 1
    for _ in range(exponent):
        # BUG: Should multiply by base, not add
        result += base
    return result