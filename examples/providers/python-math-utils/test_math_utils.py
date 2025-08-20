import pytest
from math_utils import factorial, is_prime, gcd, fibonacci, power

class TestFactorial:
    def test_factorial_zero(self):
        assert factorial(0) == 1
    
    def test_factorial_positive(self):
        assert factorial(5) == 120
        assert factorial(3) == 6
        assert factorial(1) == 1
    
    def test_factorial_negative(self):
        with pytest.raises(ValueError):
            factorial(-1)

class TestIsPrime:
    def test_small_numbers(self):
        assert not is_prime(0)
        assert not is_prime(1)
        assert is_prime(2)
        assert is_prime(3)
        assert not is_prime(4)
        assert is_prime(5)
    
    def test_larger_primes(self):
        assert is_prime(17)
        assert is_prime(19)
        assert is_prime(23)
    
    def test_larger_composites(self):
        assert not is_prime(15)
        assert not is_prime(25)
        assert not is_prime(100)

class TestGCD:
    def test_basic_gcd(self):
        assert gcd(12, 8) == 4
        assert gcd(17, 5) == 1
        assert gcd(20, 15) == 5
    
    def test_gcd_same_numbers(self):
        assert gcd(7, 7) == 7
    
    def test_gcd_with_zero(self):
        assert gcd(5, 0) == 5
        assert gcd(0, 8) == 8

class TestFibonacci:
    def test_fibonacci_base_cases(self):
        assert fibonacci(0) == 0
        assert fibonacci(1) == 1
    
    def test_fibonacci_sequence(self):
        assert fibonacci(2) == 1
        assert fibonacci(3) == 2
        assert fibonacci(4) == 3
        assert fibonacci(5) == 5
        assert fibonacci(6) == 8
        assert fibonacci(7) == 13

class TestPower:
    def test_power_positive_exponent(self):
        assert power(2, 3) == 8
        assert power(5, 2) == 25
        assert power(3, 4) == 81
    
    def test_power_zero_exponent(self):
        assert power(5, 0) == 1
        assert power(10, 0) == 1
    
    def test_power_negative_exponent(self):
        assert power(2, -2) == 0.25
        assert power(4, -1) == 0.25