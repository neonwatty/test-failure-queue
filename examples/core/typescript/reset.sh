#!/bin/bash

echo "🔄 Resetting TypeScript Calculator to buggy state..."

# Reset calculator.ts to buggy version
cat > src/calculator.ts << 'EOF'
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  divide(a: number, b: number): number {
    // BUG: Should throw error for division by zero, not return Infinity
    if (b === 0) {
      return Infinity;
    }
    return a / b;
  }

  power(base: number, exponent: number): number {
    return Math.pow(base, exponent);
  }

  sqrt(n: number): number {
    // BUG: Should throw error for negative numbers, not return NaN
    if (n < 0) {
      return NaN;
    }
    return Math.sqrt(n);
  }

  factorial(n: number): number {
    if (n < 0) {
      throw new Error('Factorial is not defined for negative numbers');
    }
    if (n === 0 || n === 1) {
      return 1;
    }
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  average(numbers: number[]): number {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      throw new Error('Invalid input: array of numbers required');
    }
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
  }
}
EOF

echo "✅ src/calculator.ts reset to buggy version"

# Rebuild TypeScript
echo "🔨 Building TypeScript..."
npm run build 2>/dev/null || true

# Clear TFQ queue for this demo
echo "🧹 Clearing TFQ queue..."
../../../bin/tfq clear 2>/dev/null || true

echo "✅ Reset complete!"
echo ""
echo "The following bugs have been introduced:"
echo "  1. divide() returns Infinity instead of throwing for division by zero"
echo "  2. sqrt() returns NaN instead of throwing for negative numbers"
echo ""
echo "You can now run the demo:"
echo "  ./demo.sh           # Run the full demo"
echo "  npm test            # See failing tests"