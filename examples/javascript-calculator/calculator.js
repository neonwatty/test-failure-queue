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