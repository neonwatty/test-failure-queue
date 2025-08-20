class Calculator
  def add(a, b)
    a + b
  end

  def subtract(a, b)
    a - b
  end

  def multiply(a, b)
    a * b
  end

  def divide(a, b)
    raise ArgumentError, 'Cannot divide by zero' if b.zero?
    a.to_f / b
  end

  def power(base, exponent)
    base**exponent
  end

  def square_root(n)
    raise ArgumentError, 'Cannot calculate square root of negative number' if n < 0
    Math.sqrt(n)
  end

  def factorial(n)
    raise ArgumentError, 'Factorial is not defined for negative numbers' if n < 0
    return 1 if n <= 1
    (1..n).reduce(:*)
  end

  def average(numbers)
    return 0 if numbers.empty?
    numbers.sum.to_f / numbers.size
  end
end