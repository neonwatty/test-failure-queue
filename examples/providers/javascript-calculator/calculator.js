/**
 * Simple calculator with intentional bugs for TFQ AI fixing demo
 */

function add(a, b) {
  // Fixed: Now correctly returns a + b
  return a + b;
}

function subtract(a, b) {
  // This function is correct
  return a - b;
}

function multiply(a, b) {
  // Fixed: Now correctly returns a * b
  return a * b;
}

function divide(a, b) {
  // Fixed: Now handles division by zero
  if (b === 0) {
    throw new Error('Division by zero is not allowed');
  }
  return a / b;
}

function power(a, b) {
  // Fixed: Now uses Math.pow for exponentiation
  return Math.pow(a, b);
}

module.exports = {
  add,
  subtract,
  multiply,
  divide,
  power
};
