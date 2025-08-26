const { describe, it, expect } = require('@jest/globals');

describe('Broken Syntax Test', () => {
  it('should have syntax error', () => {
    // Missing closing bracket
    const obj = {
      name: 'test',
      value: 42
      // missing closing bracket here
    
    expect(obj.name).toBe('test');
  });
  
  it('should have another syntax error', () => {
    // Missing quotes
    const str = test string;
    expect(str).toBe('test string');
  });
});