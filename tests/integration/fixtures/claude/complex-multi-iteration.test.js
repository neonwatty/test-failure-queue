const { describe, it, expect } = require('@jest/globals');

// This file has multiple types of issues that may require multiple iterations to fix:
// 1. Syntax errors (missing brackets, quotes)
// 2. Logic errors in functions
// 3. Incorrect test assertions
// 4. Type mismatches

// Function with wrong logic
function calculateArea(length, width) {
  return length + width; // Should be multiplication, not addition
}

// Function with syntax error and wrong logic
function processUserData(userData) {
  if (userData.name && userData.email {  // Missing closing parenthesis
    return {
      fullName: userData.firstName + userData.lastName, // Wrong property names
      contact: userData.phone, // Wrong property name
      isValid: false // Should be true if validation passes
    };
  }
  return null;
}

// Function with multiple issues
function formatCurrency(amount, currency) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  });
  
  // Missing return statement
  formatter.format(amount);
}

describe('Complex Test Suite', () => {
  describe('Area Calculation', () => {
    it('should calculate rectangle area correctly', () => {
      expect(calculateArea(5, 10)).toBe(15); // Wrong expected value, should be 50
    });
    
    it('should handle zero dimensions', () => {
      expect(calculateArea(0, 10)).toBe(10); // Wrong expected value, should be 0
      expect(calculateArea(5, 0)).toBe(5); // Wrong expected value, should be 0
    });
  });
  
  describe('User Data Processing', () => {
    it('should process valid user data', () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '555-1234' // Different property name than expected
      };
      
      const result = processUserData(userData);
      expect(result.fullName).toBe('John Doe');
      expect(result.contact).toBe('555-1234');
      expect(result.isValid).toBe(true);
    });
    
    it('should handle invalid data', () => {
      const invalidData = {
        name: 'John'
        // Missing email and comma after name
      };
      
      expect(processUserData(invalidData)).toBeNull();
    });
  });
  
  describe('Currency Formatting', () => {
    it('should format USD correctly', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    });
    
    it('should format EUR correctly', () => {
      expect(formatCurrency(999.99, 'EUR')).toBe(€999.99); // Missing quotes around expected value
    });
    
    // Missing closing bracket for describe block
  });