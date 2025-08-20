const { add, subtract, multiply, divide, power } = require('./calculator');

describe('Calculator', () => {
  describe('add', () => {
    test('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    test('should add positive and negative numbers', () => {
      expect(add(5, -3)).toBe(2);
    });

    test('should add two negative numbers', () => {
      expect(add(-2, -3)).toBe(-5);
    });

    test('should handle zero', () => {
      expect(add(0, 5)).toBe(5);
      expect(add(5, 0)).toBe(5);
    });
  });

  describe('subtract', () => {
    test('should subtract two positive numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });

    test('should subtract negative from positive', () => {
      expect(subtract(5, -3)).toBe(8);
    });

    test('should handle zero', () => {
      expect(subtract(5, 0)).toBe(5);
      expect(subtract(0, 5)).toBe(-5);
    });
  });

  describe('multiply', () => {
    test('should multiply two positive numbers', () => {
      expect(multiply(3, 4)).toBe(12);
    });

    test('should multiply positive and negative', () => {
      expect(multiply(3, -4)).toBe(-12);
    });

    test('should multiply by zero', () => {
      expect(multiply(5, 0)).toBe(0);
      expect(multiply(0, 5)).toBe(0);
    });

    test('should multiply decimals', () => {
      expect(multiply(2.5, 4)).toBe(10);
    });
  });

  describe('divide', () => {
    test('should divide two positive numbers', () => {
      expect(divide(12, 3)).toBe(4);
    });

    test('should divide positive by negative', () => {
      expect(divide(12, -3)).toBe(-4);
    });

    test('should handle decimals', () => {
      expect(divide(5, 2)).toBe(2.5);
    });

    test('should throw error when dividing by zero', () => {
      expect(() => divide(5, 0)).toThrow('Division by zero is not allowed');
    });
  });

  describe('power', () => {
    test('should calculate power of positive numbers', () => {
      expect(power(2, 3)).toBe(8);
    });

    test('should calculate power with zero exponent', () => {
      expect(power(5, 0)).toBe(1);
    });

    test('should calculate power with negative exponent', () => {
      expect(power(2, -2)).toBe(0.25);
    });

    test('should handle decimal base', () => {
      expect(power(1.5, 2)).toBe(2.25);
    });
  });
});