#!/bin/bash

echo "🔄 Resetting Ruby Calculator to buggy state..."

# Reset calculator.rb to buggy version
cat > lib/calculator.rb << 'EOF'
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
    raise ArgumentError, "Division by zero is not allowed" if b == 0
    # BUG: Should return Float, not Rational
    Rational(a, b)
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
EOF

echo "✅ lib/calculator.rb reset to buggy version"

# Clear TFQ queue for this demo
echo "🧹 Clearing TFQ queue..."
../../../bin/tfq clear 2>/dev/null || true

echo "✅ Reset complete!"
echo ""
echo "The following bugs have been introduced:"
echo "  1. divide() returns Rational instead of Float"
echo "  2. add() concatenates strings when given string input"
echo "  3. average() returns median instead of mean"
echo ""
echo "You can now run the demo:"
echo "  ./demo.sh                              # Run the full demo"
echo "  ruby -Ilib:test test/edge_cases_test.rb  # See failing tests"