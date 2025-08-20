import { describe, it, expect } from 'vitest';
import { Calculator } from '../src/calculator';

describe('Calculator', () => {
  const calculator = new Calculator();

  describe('Basic Operations', () => {
    it('should add two numbers correctly', () => {
      expect(calculator.add(2, 3)).toBe(5);
      expect(calculator.add(-1, 1)).toBe(0);
      expect(calculator.add(0.1, 0.2)).toBeCloseTo(0.3);
    });

    it('should subtract two numbers correctly', () => {
      expect(calculator.subtract(5, 3)).toBe(2);
      expect(calculator.subtract(0, 5)).toBe(-5);
      expect(calculator.subtract(-3, -3)).toBe(0);
    });

    it('should multiply two numbers correctly', () => {
      expect(calculator.multiply(3, 4)).toBe(12);
      expect(calculator.multiply(-2, 3)).toBe(-6);
      expect(calculator.multiply(0, 100)).toBe(0);
    });

    it('should divide with incorrect expected value (FAILING TEST)', () => {
      expect(calculator.divide(10, 2)).toBe(3); // This will fail - should be 5
    });

    it('should handle complex division incorrectly (FAILING TEST)', () => {
      expect(calculator.divide(7, 3)).toBe(2); // This will fail - should be ~2.333
    });
  });

  describe('Advanced Operations', () => {
    it('should calculate power correctly', () => {
      expect(calculator.power(2, 3)).toBe(8);
      expect(calculator.power(5, 0)).toBe(1);
      expect(calculator.power(10, -1)).toBe(0.1);
    });

    it('should calculate square root correctly', () => {
      expect(calculator.sqrt(9)).toBe(3);
      expect(calculator.sqrt(16)).toBe(4);
      expect(calculator.sqrt(2)).toBeCloseTo(1.414, 2);
    });

    it('should calculate percentage correctly', () => {
      expect(calculator.percentage(100, 25)).toBe(25);
      expect(calculator.percentage(50, 10)).toBe(5);
      expect(calculator.percentage(200, 50)).toBe(100);
    });
  });
});