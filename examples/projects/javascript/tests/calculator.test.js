const Calculator = require('../src/calculator');

describe('Calculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('Basic Operations', () => {
    test('should add two numbers correctly', () => {
      expect(calculator.add(2, 3)).toBe(5);
      expect(calculator.add(-1, 1)).toBe(0);
      expect(calculator.add(0.1, 0.2)).toBeCloseTo(0.3);
    });

    test('should subtract two numbers correctly', () => {
      expect(calculator.subtract(5, 3)).toBe(2);
      expect(calculator.subtract(0, 5)).toBe(-5);
      expect(calculator.subtract(-3, -7)).toBe(4);
    });

    test('should multiply two numbers correctly', () => {
      expect(calculator.multiply(3, 4)).toBe(12);
      expect(calculator.multiply(-2, 5)).toBe(-10);
      expect(calculator.multiply(0, 100)).toBe(0);
    });
  });

  describe('Division Operations', () => {
    test('should divide two numbers correctly', () => {
      expect(calculator.divide(10, 2)).toBe(5);
      expect(calculator.divide(7, 2)).toBe(3.5);
      expect(calculator.divide(-8, 4)).toBe(-2);
    });

    test('should throw error when dividing by zero', () => {
      expect(() => calculator.divide(10, 0)).toThrow('Division by zero is not allowed');
    });

    test('FAILING: should handle complex division (intentional failure)', () => {
      expect(calculator.divide(10, 3)).toBe(3);
    });
  });

  describe('Advanced Operations', () => {
    test('should calculate power correctly', () => {
      expect(calculator.power(2, 3)).toBe(8);
      expect(calculator.power(5, 0)).toBe(1);
      expect(calculator.power(10, -1)).toBe(0.1);
    });

    test('should calculate square root correctly', () => {
      expect(calculator.sqrt(4)).toBe(2);
      expect(calculator.sqrt(9)).toBe(3);
      expect(calculator.sqrt(2)).toBeCloseTo(1.414, 2);
    });

    test('FAILING: should handle negative square roots (intentional failure)', () => {
      expect(calculator.sqrt(-4)).toBe(2);
    });

    test('should calculate factorial correctly', () => {
      expect(calculator.factorial(0)).toBe(1);
      expect(calculator.factorial(5)).toBe(120);
      expect(calculator.factorial(10)).toBe(3628800);
    });
  });

  describe('Flaky Tests', () => {
    test('FLAKY: should randomly pass or fail', () => {
      const random = Math.random();
      const result = calculator.add(1, 1);
      
      if (random > 0.5) {
        expect(result).toBe(2);
      } else {
        expect(result).toBe(3);
      }
    });
  });
});