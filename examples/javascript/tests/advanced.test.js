const Calculator = require('../src/calculator');

describe('Advanced Calculator Features', () => {
  let calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('Priority Level Tests', () => {
    test('HIGH PRIORITY: Critical calculation accuracy', () => {
      const result = calculator.multiply(999999, 999999);
      expect(result).toBe(999998000001);
    });

    test('MEDIUM PRIORITY: Average calculation', () => {
      const numbers = [10, 20, 30, 40, 50];
      expect(calculator.average(numbers)).toBe(30);
    });

    test('LOW PRIORITY: Edge case handling', () => {
      expect(calculator.add(Number.MAX_SAFE_INTEGER, 0)).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very small numbers', () => {
      const result = calculator.multiply(0.0000001, 0.0000001);
      expect(result).toBeCloseTo(1e-14);
    });

    test('should handle negative exponents', () => {
      expect(calculator.power(2, -3)).toBe(0.125);
      expect(calculator.power(10, -2)).toBe(0.01);
    });

    test('should handle invalid average input', () => {
      // Calculator average method doesn't throw for empty arrays, it returns NaN
      expect(calculator.average([])).toBeNaN();
    });

    test('should throw error for negative factorial', () => {
      expect(() => calculator.factorial(-5)).toThrow('Factorial is not defined for negative numbers');
    });
  });

  describe('Complex Calculations', () => {
    test('should chain multiple operations', () => {
      const result1 = calculator.add(5, 3); // 8
      const result2 = calculator.multiply(result1, 2); // 16
      const result3 = calculator.subtract(result2, 6); // 10
      const final = calculator.divide(result3, 2); // 5
      expect(final).toBe(5);
    });

    test('should handle complex mathematical expressions', () => {
      const result = calculator.add(
        calculator.multiply(3, 4), // 12
        calculator.divide(10, 2)   // 5
      );
      expect(result).toBe(17); // 12 + 5 = 17
    });

    test('should calculate compound interest', () => {
      const principal = 1000;
      const rate = 0.05;
      const time = 10;
      const compound = calculator.multiply(
        principal,
        calculator.power(calculator.add(1, rate), time)
      );
      expect(compound).toBeCloseTo(1628.89, 2);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large factorial calculations', () => {
      const start = Date.now();
      const result = calculator.factorial(20);
      const end = Date.now();
      
      expect(result).toBe(2432902008176640000);
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Array Operations', () => {
    test('should calculate average of positive numbers', () => {
      expect(calculator.average([1, 2, 3, 4, 5])).toBe(3);
    });

    test('should calculate average of mixed numbers', () => {
      expect(calculator.average([-10, 0, 10, 20])).toBe(5);
    });

    test('should handle single element array', () => {
      expect(calculator.average([42])).toBe(42);
    });

    test('should handle empty array', () => {
      // Calculator average method doesn't throw for empty arrays, it returns NaN
      expect(calculator.average([])).toBeNaN();
    });
  });
});