class Calculator
  def add(a, b)
    # BUG: Should add numbers, not concatenate strings
    if a.is_a?(String) || b.is_a?(String)
      return a.to_s + b.to_s
    end
    a + b
  end

  def subtract(a, b)
    a - b
  end

  def multiply(a, b)
    a * b
  end

  def divide(a, b)
    raise ArgumentError, "Cannot divide by zero" if b == 0
    # Always return Float
    a.to_f / b
  end

  def power(a, b)
    a ** b
  end

  def factorial(n)
    raise ArgumentError, "Factorial is not defined for negative numbers" if n < 0
    return 1 if n == 0 || n == 1
    (1..n).reduce(:*)
  end

  def square_root(n)
    raise ArgumentError, "Cannot calculate square root of negative number" if n < 0
    Math.sqrt(n)
  end

  def average(numbers)
    return 0 if numbers.empty?
    # BUG: Should return mean, not median
    sorted = numbers.sort
    mid = sorted.length / 2
    if sorted.length.odd?
      sorted[mid].to_f
    else
      (sorted[mid - 1] + sorted[mid]) / 2.0
    end
  end
end
