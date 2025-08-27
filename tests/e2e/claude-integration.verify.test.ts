import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Verification tests for E2E Claude integration setup
 * These tests verify that the E2E test infrastructure is properly set up
 */

describe('Claude E2E Test Infrastructure Verification', () => {
  it('should have E2E test file present', () => {
    const testFile = path.join(__dirname, 'claude-integration.test.ts');
    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('should have README documentation', () => {
    const readmeFile = path.join(__dirname, 'README.md');
    expect(fs.existsSync(readmeFile)).toBe(true);
    
    const content = fs.readFileSync(readmeFile, 'utf-8');
    expect(content).toContain('TFQ_TEST_CLAUDE=true');
    expect(content).toContain('Full Manual Workflow Automation');
    expect(content).toContain('Fix-All Complete Workflow');
  });

  it('should have examples/javascript directory for test fixtures', () => {
    // Use path relative to this test file to find project root
    const projectRoot = path.resolve(__dirname, '../..');
    const exampleDir = path.join(projectRoot, 'examples', 'javascript');
    expect(fs.existsSync(exampleDir)).toBe(true);
    
    // Should have test files
    const testsDir = path.join(exampleDir, 'tests');
    expect(fs.existsSync(testsDir)).toBe(true);
    
    // Should have package.json
    const packageJson = path.join(exampleDir, 'package.json');
    expect(fs.existsSync(packageJson)).toBe(true);
  });

  it('should have reset script for example directory', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const exampleDir = path.join(projectRoot, 'examples', 'javascript');
    const resetScript = path.join(exampleDir, 'reset.sh');
    
    if (fs.existsSync(resetScript)) {
      // If reset script exists, should be executable
      const stats = fs.statSync(resetScript);
      expect(stats.isFile()).toBe(true);
    }
    // Note: reset script might not exist, which is acceptable
  });

  it('should include proper test structure in E2E test file', () => {
    const testFile = path.join(__dirname, 'claude-integration.test.ts');
    const content = fs.readFileSync(testFile, 'utf-8');
    
    // Should have environment variable check
    expect(content).toContain('TFQ_TEST_CLAUDE');
    
    // Should have Claude availability check
    expect(content).toContain('checkClaudeAvailability');
    
    // Should have both main test workflows
    expect(content).toContain('Full Manual Workflow Automation');
    expect(content).toContain('Fix-All Complete Workflow');
    
    // Should have proper timeout management
    expect(content).toContain('240000'); // 4 minute timeout for manual workflow
    expect(content).toContain('360000'); // 6 minute timeout for fix-all workflow
    
    // Should use test utilities
    expect(content).toContain('setupIntegrationTest');
    expect(content).toContain('runTfqCommand');
  });

  it('should properly skip tests when Claude not available', () => {
    // This verifies the test structure includes proper skipping logic
    const testFile = path.join(__dirname, 'claude-integration.test.ts');
    const content = fs.readFileSync(testFile, 'utf-8');
    
    expect(content).toContain('this.skip()');
    expect(content).toContain('Claude CLI not available');
    expect(content).toContain('beforeEach(async function()');
  });

  it('should have comprehensive test scenarios', () => {
    const testFile = path.join(__dirname, 'claude-integration.test.ts');
    const content = fs.readFileSync(testFile, 'utf-8');
    
    // Should test error contexts
    expect(content).toContain('error context');
    
    // Should test timeout handling  
    expect(content).toContain('timeout gracefully');
    
    // Should test configuration
    expect(content).toContain('custom Claude configuration');
    
    // Should test progress reporting
    expect(content).toContain('progress and statistics');
  });
});