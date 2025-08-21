class Calculator {
  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  multiply(a, b) {
    // BUG: Should return a * b, not fixed value
    return 17;
  }

  divide(a, b) {
    if (b === 0) {
      throw new Error('Division by zero is not allowed');
    }
    return a / b;
  }

  power(base, exponent) {
    return Math.pow(base, exponent);
  }

  sqrt(n) {
    if (n < 0) {
      throw new Error('Cannot calculate square root of negative number');
    }
    return Math.sqrt(n);
  }

  factorial(n) {
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

  average(numbers) {
    // BUG: Doesn't handle empty arrays properly
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return sum / numbers.length;
  }
}

module.exports = Calculator;
