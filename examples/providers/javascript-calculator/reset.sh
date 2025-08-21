#!/bin/bash

echo "🔄 Resetting JavaScript Calculator to original buggy state..."

# Reset calculator.js to buggy version
cat > calculator.js << 'EOF'
/**
 * Simple calculator with intentional bugs for TFQ AI fixing demo
 */

function add(a, b) {
  // BUG: Should return a + b, not a - b
  return a - b;
}

function subtract(a, b) {
  // This function is correct
  return a - b;
}

function multiply(a, b) {
  // BUG: Should return a * b, not a + b
  return a + b;
}

function divide(a, b) {
  // BUG: Should handle division by zero
  return a / b;
}

function power(a, b) {
  // BUG: Should use Math.pow or ** operator
  return a * b;
}

module.exports = {
  add,
  subtract,
  multiply,
  divide,
  power
};
EOF

echo "✅ calculator.js reset to buggy version"

# Clear TFQ queue for this demo
echo "🧹 Clearing TFQ queue..."
../../../bin/tfq clear 2>/dev/null || true

echo "✅ Reset complete!"
echo ""
echo "You can now run the demo again:"
echo "  1. npm test           # See failing tests"
echo "  2. ../../../bin/tfq run-tests --auto-detect --auto-add"
echo "  3. ../../../bin/tfq fix-tests --verbose"