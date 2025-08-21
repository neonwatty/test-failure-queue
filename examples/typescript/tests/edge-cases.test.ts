import { describe, it, expect } from 'vitest';
import { Calculator } from '../src/calculator';

describe('Edge Cases', () => {
  const calculator = new Calculator();

  describe('Division Edge Cases', () => {
    it('should handle division by zero gracefully (FAILING TEST)', () => {
      const result = calculator.divide(10, 0);
      expect(result).toBe(Infinity); // This will fail - throws an error instead
    });

    it('should throw error for division by zero', () => {
      expect(() => calculator.divide(10, 0)).toThrow('Division by zero is not allowed');
    });

    it('should handle very small divisors', () => {
      expect(calculator.divide(1, 0.0000001)).toBeCloseTo(10000000);
    });
  });

  describe('Overflow and Underflow', () => {
    it('should handle large number multiplication', () => {
      const large = Number.MAX_SAFE_INTEGER;
      const result = calculator.multiply(large, 2);
      expect(result).toBeGreaterThan(large);
    });

    it('should handle very small number operations', () => {
      expect(calculator.add(0.0000001, 0.0000002)).toBeCloseTo(0.0000003);
    });
  });

  describe('NaN and Infinity Handling', () => {
    it('should handle Infinity in operations', () => {
      expect(calculator.add(Infinity, 1)).toBe(Infinity);
      expect(calculator.multiply(Infinity, 0)).toBeNaN();
    });

    it('should handle NaN propagation', () => {
      expect(calculator.add(NaN, 5)).toBeNaN();
      expect(calculator.multiply(NaN, 0)).toBeNaN();
    });
  });

  describe('Square Root Edge Cases', () => {
    it('should handle square root of negative numbers (FAILING TEST)', () => {
      const result = calculator.sqrt(-4);
      expect(result).toBeNaN(); // This will fail - throws an error instead
    });

    it('should throw error for negative square root', () => {
      expect(() => calculator.sqrt(-4)).toThrow('Cannot calculate square root of negative number');
    });

    it('should handle square root of zero', () => {
      expect(calculator.sqrt(0)).toBe(0);
    });
  });

  describe('Type Coercion Prevention', () => {
    it('should maintain type safety with TypeScript', () => {
      const result: number = calculator.add(5, 3);
      expect(typeof result).toBe('number');
      expect(result).toBe(8);
    });
  });
});