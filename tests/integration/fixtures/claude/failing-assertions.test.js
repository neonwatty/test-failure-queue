const { describe, it, expect } = require('@jest/globals');

function add(a, b) {
  return a - b; // Wrong operation!
}

function multiply(a, b) {
  return a + b; // Wrong operation!
}

describe('Math Functions Test', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5); // This will fail
  });
  
  it('should multiply two numbers correctly', () => {
    expect(multiply(4, 5)).toBe(20); // This will fail
  });
  
  it('should handle zero correctly', () => {
    expect(add(0, 5)).toBe(5); // This will fail
    expect(multiply(0, 5)).toBe(0); // This will fail
  });
});