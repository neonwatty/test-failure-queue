export interface CalculatorOperations {
  add(a: number, b: number): number;
  subtract(a: number, b: number): number;
  multiply(a: number, b: number): number;
  divide(a: number, b: number): number;
}

export class Calculator implements CalculatorOperations {
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
    if (b === 0) {
      throw new Error("Division by zero is not allowed");
    }
    return a / b;
  }

  power(base: number, exponent: number): number {
    return Math.pow(base, exponent);
  }

  sqrt(value: number): number {
    if (value < 0) {
      throw new Error("Cannot calculate square root of negative number");
    }
    return Math.sqrt(value);
  }

  percentage(value: number, percentage: number): number {
    return (value * percentage) / 100;
  }
}