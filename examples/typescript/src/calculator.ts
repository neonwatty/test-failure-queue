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
