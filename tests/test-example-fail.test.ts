/**
 * This test file intentionally contains failing tests
 * to verify the test-runner's failure detection works correctly.
 * 
 * DO NOT FIX THESE TESTS - They are meant to fail for testing purposes.
 */
describe('Example Failing Test (Intentional)', () => {
  it('should fail for testing purposes', () => {
    // This test intentionally fails to test failure detection
    expect(true).toBe(false);
  });

  it('should also fail', () => {
    // This test intentionally fails to test failure detection
    expect(1 + 1).toBe(3);
  });
});