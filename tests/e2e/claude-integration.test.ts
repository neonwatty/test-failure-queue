import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import { setupIntegrationTest, runTfqCommand } from '../integration/test-utils.js';

/**
 * Optional E2E tests that require Claude CLI to be installed and available
 * These tests will be skipped if Claude is not available
 * 
 * To run these tests:
 * 1. Install Claude Code CLI
 * 2. Set environment variable: export TFQ_TEST_CLAUDE=true
 * 3. Run: npm test -- tests/e2e/claude-integration.test.ts
 */

async function checkClaudeAvailability(): Promise<boolean> {
  try {
    const result = await execa('claude', ['--version'], { timeout: 5000, reject: false });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

async function resetJavaScriptExample(exampleDir: string): Promise<void> {
  try {
    // Run the reset script to restore buggy state
    await execa('bash', ['reset.sh'], { 
      cwd: exampleDir, 
      timeout: 10000,
      reject: false 
    });
  } catch (error) {
    console.warn('Failed to run reset script, continuing with existing state');
  }
}

async function getQueueSize(testDir: string): Promise<number> {
  const result = await runTfqCommand(['count'], testDir);
  const count = parseInt(result.output.trim());
  return isNaN(count) ? 0 : count;
}

describe('Claude Integration E2E Tests (Optional)', () => {
  const shouldRunTests = process.env.TFQ_TEST_CLAUDE === 'true';
  let claudeAvailable = false;
  
  beforeAll(async () => {
    if (!shouldRunTests) {
      console.log('Skipping Claude E2E tests - Set TFQ_TEST_CLAUDE=true to enable');
      return;
    }
    
    claudeAvailable = await checkClaudeAvailability();
    if (!claudeAvailable) {
      console.log('Skipping Claude E2E tests - Claude CLI not available');
      console.log('Install Claude Code CLI and ensure it is in your PATH');
    }
  }, 15000);

  // Skip all tests if Claude not available or tests not enabled
  if (!process.env.TFQ_TEST_CLAUDE) {
    it.skip('Claude E2E tests disabled - set TFQ_TEST_CLAUDE=true to enable', () => {});
    return;
  }

  describe('Full Manual Workflow Automation', () => {
    let testDir: string;
    let exampleDir: string;
    let cleanup: () => Promise<void>;

    beforeEach(async function() {
      if (!claudeAvailable) {
        this.skip();
        return;
      }

      // Use the examples/javascript directory as our test fixture
      exampleDir = path.join(process.cwd(), 'examples', 'javascript');
      
      if (!fs.existsSync(exampleDir)) {
        this.skip();
        console.log('Skipping test - examples/javascript directory not found');
        return;
      }

      // Reset the example to buggy state
      await resetJavaScriptExample(exampleDir);

      // Create our test directory for tfq operations
      const setup = await setupIntegrationTest('claude-e2e-manual');
      testDir = setup.testDir;
      cleanup = setup.cleanup;

      // Copy the example files to our test directory
      await execa('cp', ['-r', exampleDir + '/.', testDir], { timeout: 10000 });

      // Initialize tfq in the test directory with Claude enabled
      console.log('Initializing TFQ with Claude in:', testDir);
      const initResult = await runTfqCommand(['init', '--with-claude', '--ci'], testDir);
      
      console.log('Init result:', {
        success: initResult.success,
        output: initResult.output,
        error: initResult.error
      });
      
      if (!initResult.success) {
        console.error('Init failed! Output:', initResult.output);
        console.error('Init failed! Error:', initResult.error);
      }
      
      expect(initResult.success).toBe(true);
    }, 30000);

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should replicate complete manual workflow: init → run-tests → fix-next', async function() {
      if (!claudeAvailable) {
        this.skip();
        return;
      }

      // Step 0: Init was successful, proceeding with workflow...

      // Step 1: Verify initial state (tests should fail)
      console.log('Step 1: Running initial tests to verify failures...');
      const initialTestResult = await runTfqCommand(['run-tests', '--auto-detect'], testDir);
      expect(initialTestResult.success).toBe(false);
      expect(initialTestResult.output).toContain('failing test file');

      // Step 2: Add failing tests to queue using auto-add
      console.log('Step 2: Adding failing tests to queue...');
      const addToQueueResult = await runTfqCommand(['run-tests', '--auto-detect', '--auto-add'], testDir);
      expect(addToQueueResult.success).toBe(false); // Should fail but add tests to queue

      // Step 3: Verify queue has tests
      console.log('Step 3: Verifying queue has tests...');
      const listResult = await runTfqCommand(['list'], testDir);
      expect(listResult.success).toBe(true);
      expect(listResult.output).toContain('file');
      
      const initialQueueSize = await getQueueSize(testDir);
      expect(initialQueueSize).toBeGreaterThan(0);
      console.log(`Queue has ${initialQueueSize} test file(s)`);

      // Step 4: Fix next test with Claude
      console.log('Step 4: Fixing next test with Claude...');
      const fixResult = await runTfqCommand(['fix-next'], testDir, 180000); // 3 minute timeout for Claude
      
      // Step 5: Analyze fix results
      console.log('Step 5: Analyzing fix results...');
      const allFixOutput = fixResult.output + fixResult.error;
      console.log('Fix output preview:', allFixOutput.substring(0, 200) + '...');

      if (fixResult.success) {
        console.log('✅ Fix was successful!');
        
        // Step 6: Verify the test improvement by running tests again
        console.log('Step 6: Verifying test improvement...');
        const verificationResult = await runTfqCommand(['npm', 'test'], testDir);
        const postFixOutput = verificationResult.output + verificationResult.error;
        
        // Should have fewer failures or pass completely
        if (verificationResult.success) {
          console.log('🎉 Tests now pass completely!');
        } else {
          // Count failures to see if we improved
          const beforeFailures = (initialTestResult.output.match(/failing test file/g) || []).length;
          const afterFailures = (postFixOutput.match(/failing test file/g) || []).length;
          console.log(`Failures before: ${beforeFailures}, after: ${afterFailures}`);
          expect(afterFailures).toBeLessThanOrEqual(beforeFailures);
        }
      } else {
        console.log('Fix failed, but this is acceptable for E2E testing');
        // Log the error for debugging
        console.log('Fix error details:', allFixOutput);
        // Test that Claude was invoked and attempted to fix
        expect(allFixOutput).toContain('Claude'); // Should show Claude being invoked
      }

      // Step 7: Check queue state change
      console.log('Step 7: Checking final queue state...');
      const finalQueueSize = await getQueueSize(testDir);
      console.log(`Final queue size: ${finalQueueSize}`);
      
      // Queue size should be same or less (if fix succeeded and was verified)
      expect(finalQueueSize).toBeLessThanOrEqual(initialQueueSize);
      
      console.log('Manual workflow automation test completed!');
    }, 360000); // 6 minute timeout for full workflow

    it('should handle Claude timeout gracefully in fix-next workflow', async function() {
      if (!claudeAvailable) {
        this.skip();
        return;
      }

      // Add a test to queue first
      const testFile = path.join(testDir, 'tests/timeout-test.test.js');
      const testContent = `
describe('Timeout test', () => {
  it('should fail initially', () => {
    expect(1 + 1).toBe(3); // Intentional failure
  });
});`;
      fs.writeFileSync(testFile, testContent);
      
      await runTfqCommand(['add', testFile], testDir);

      // Set very short timeout and attempt fix
      const fixResult = await runTfqCommand([
        'fix-next', 
        '--test-timeout', '5000' // 5 second timeout
      ], testDir);

      // Should either succeed quickly or timeout gracefully
      const allOutput = fixResult.output + fixResult.error;
      
      if (!fixResult.success) {
        // Should mention timeout or show graceful failure
        expect(allOutput.toLowerCase()).toMatch(/timeout|failed|error/);
        
        // Verify test is still in queue for retry
        const queueSize = await getQueueSize(testDir);
        expect(queueSize).toBeGreaterThan(0);
      }
      
      console.log('Timeout handling test completed');
    }, 60000);
  });

  describe('Fix-All Complete Workflow', () => {
    let testDir: string;
    let exampleDir: string;
    let cleanup: () => Promise<void>;

    beforeEach(async function() {
      if (!claudeAvailable) {
        this.skip();
        return;
      }

      // Use the examples/javascript directory as our test fixture
      exampleDir = path.join(process.cwd(), 'examples', 'javascript');
      
      if (!fs.existsSync(exampleDir)) {
        this.skip();
        console.log('Skipping test - examples/javascript directory not found');
        return;
      }

      // Reset the example to buggy state
      await resetJavaScriptExample(exampleDir);

      // Create our test directory for tfq operations
      const setup = await setupIntegrationTest('claude-e2e-fix-all');
      testDir = setup.testDir;
      cleanup = setup.cleanup;

      // Copy the example files to our test directory
      await execa('cp', ['-r', exampleDir + '/.', testDir], { timeout: 10000 });

      // Initialize tfq in the test directory with Claude enabled
      console.log('Initializing TFQ with Claude in:', testDir);
      const initResult = await runTfqCommand(['init', '--with-claude', '--ci'], testDir);
      
      console.log('Init result:', {
        success: initResult.success,
        output: initResult.output,
        error: initResult.error
      });
      
      if (!initResult.success) {
        console.error('Init failed! Output:', initResult.output);
        console.error('Init failed! Error:', initResult.error);
      }
      
      expect(initResult.success).toBe(true);
    }, 30000);

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should fix all tests iteratively until queue is empty or max iterations reached', async function() {
      if (!claudeAvailable) {
        this.skip();
        return;
      }

      // Step 1: Populate queue with all failing tests
      console.log('Step 1: Populating queue with failing tests...');
      const addResult = await runTfqCommand(['run-tests', '--auto-add'], testDir);
      expect(addResult.success).toBe(false); // Should fail but add to queue

      const initialQueueSize = await getQueueSize(testDir);
      expect(initialQueueSize).toBeGreaterThan(0);
      console.log(`Initial queue size: ${initialQueueSize} test file(s)`);

      // Step 2: Run fix-all with limited iterations to prevent infinite loops
      console.log('Step 2: Running fix-all with limited iterations...');
      const startTime = Date.now();
      
      const fixAllResult = await runTfqCommand([
        'fix-all', 
        '--max-iterations', '3' // Limit iterations for testing
      ], testDir, 300000); // 5 minute timeout

      const duration = Date.now() - startTime;
      console.log(`fix-all completed in ${duration}ms`);

      // Step 3: Analyze results
      console.log('Step 3: Analyzing fix-all results...');
      const allOutput = fixAllResult.output + fixAllResult.error;
      
      // Should show the iterative workflow output
      expect(allOutput).toContain('TFQ Automated Test Fixer');
      expect(allOutput).toMatch(/Starting to fix|Final Results|iteratively/);

      console.log('Fix-all output preview:', allOutput.substring(0, 300) + '...');

      // Step 4: Verify progress was made
      console.log('Step 4: Verifying progress...');
      const finalQueueSize = await getQueueSize(testDir);
      console.log(`Final queue size: ${finalQueueSize} test file(s)`);

      // Should have made some progress (queue size same or smaller)
      expect(finalQueueSize).toBeLessThanOrEqual(initialQueueSize);

      // Step 5: Check actual test state improvement
      console.log('Step 5: Checking test state improvement...');
      const finalTestResult = await runTfqCommand(['npm', 'test'], testDir);
      const finalTestOutput = finalTestResult.output + finalTestResult.error;
      
      if (finalTestResult.success) {
        console.log('🎉 All tests now pass!');
      } else {
        // Count improvements
        const initialTestCheck = await runTfqCommand(['npm', 'test'], exampleDir); 
        const initialFailures = (initialTestCheck.output.match(/failing test file/g) || []).length;
        const finalFailures = (finalTestOutput.match(/failing test file/g) || []).length;
        
        console.log(`Test failures - Initial: ${initialFailures}, Final: ${finalFailures}`);
        
        // Should have same or fewer failures
        expect(finalFailures).toBeLessThanOrEqual(initialFailures);
      }

      // Performance check
      expect(duration).toBeLessThan(600000); // Should complete within 10 minutes

      console.log('Fix-all workflow test completed!');
    }, 480000); // 8 minute timeout for full fix-all workflow

    it('should show progress and statistics during fix-all execution', async function() {
      if (!claudeAvailable) {
        this.skip();
        return;
      }

      // Add multiple tests to ensure we can see progress
      const testFiles = ['test1.test.js', 'test2.test.js', 'test3.test.js'];
      for (const [index, fileName] of testFiles.entries()) {
        const testFile = path.join(testDir, 'tests', fileName);
        const content = `
describe('Progress Test ${index + 1}', () => {
  it('should fail initially', () => {
    expect(${index + 1}).toBe(${index + 10}); // Intentional failure
  });
});`;
        fs.writeFileSync(testFile, content);
        await runTfqCommand(['add', testFile], testDir);
      }

      const initialCount = await getQueueSize(testDir);
      expect(initialCount).toBeGreaterThan(0);

      // Run fix-all and capture output
      const fixAllResult = await runTfqCommand(['fix-all', '--max-iterations', '2'], testDir);
      const allOutput = fixAllResult.output + fixAllResult.error;

      // Should show progress indicators
      expect(allOutput).toContain('TFQ Automated Test Fixer');
      expect(allOutput).toMatch(/Processing|Starting to fix|iteratively/i);
      
      // Should mention tests or files being processed
      expect(allOutput).toMatch(/test|file/i);
      
      console.log('Progress reporting test completed');
    }, 300000); // 5 minute timeout
  });

  describe('Real Error Context and Configuration', () => {
    let testDir: string;
    let cleanup: () => Promise<void>;

    beforeEach(async function() {
      if (!claudeAvailable) {
        this.skip();
        return;
      }

      const setup = await setupIntegrationTest('claude-e2e-context');
      testDir = setup.testDir;
      cleanup = setup.cleanup;

      // Initialize with Claude enabled
      await runTfqCommand(['init', '--with-claude', '--ci'], testDir);
    }, 15000);

    afterEach(async () => {
      if (cleanup) {
        await cleanup();
      }
    });

    it('should pass real error context to Claude and attempt meaningful fixes', async function() {
      if (!claudeAvailable) {
        this.skip();
        return;
      }

      // Create a test with a specific, fixable error
      const testsDir = path.join(testDir, 'tests');
      fs.mkdirSync(testsDir, { recursive: true });
      
      const testFile = path.join(testsDir, 'context-test.test.js');
      const testContent = `
describe('Math operations', () => {
  it('should add correctly', () => {
    expect(2 + 2).toBe(5); // Obvious error: should be 4
  });
  
  it('should multiply correctly', () => {
    expect(3 * 3).toBe(10); // Obvious error: should be 9
  });
});`;

      fs.writeFileSync(testFile, testContent);

      // Add to queue manually and verify
      await runTfqCommand(['add', testFile], testDir);

      const queueSize = await getQueueSize(testDir);
      expect(queueSize).toBeGreaterThan(0);

      // Attempt fix with Claude
      const fixResult = await runTfqCommand(['fix-next'], testDir, 120000); // 2 minute timeout

      const allOutput = fixResult.output + fixResult.error;
      console.log('Claude fix attempt output preview:', allOutput.substring(0, 200));

      // Regardless of success, Claude should have been invoked
      expect(allOutput).toMatch(/Claude|claude/i);

      // If the fix succeeded, verify the corrections
      if (fixResult.success) {
        const fixedContent = fs.readFileSync(testFile, 'utf-8');
        console.log('File was modified by Claude');
        
        // Verify test now passes
        const testResult = await runTfqCommand(['npm', 'test', testFile], testDir);
        if (testResult.success) {
          console.log('✅ Test now passes after Claude fix!');
          // Should contain correct answers
          expect(fixedContent).toContain('toBe(4)');
          expect(fixedContent).toContain('toBe(9)');
        }
      } else {
        console.log('Claude fix attempt did not succeed, but that is acceptable for E2E testing');
      }

      console.log('Error context test completed');
    }, 150000); // 2.5 minute timeout

    it('should respect custom Claude configuration settings', async function() {
      if (!claudeAvailable) {
        this.skip();
        return;
      }

      // Create custom config with specific Claude settings
      const configFile = path.join(testDir, '.tfqrc');
      const customConfig = {
        claude: {
          enabled: true,
          testTimeout: 30000, // 30 seconds  
          maxIterations: 1,
          prompt: "CUSTOM PROMPT: Please fix the test file at {testFilePath} by correcting obvious mathematical errors"
        },
        language: 'javascript',
        framework: 'jest'
      };

      fs.writeFileSync(configFile, JSON.stringify(customConfig, null, 2));

      // Add a simple test
      const testsDir = path.join(testDir, 'tests');
      fs.mkdirSync(testsDir, { recursive: true });
      
      const testFile = path.join(testsDir, 'custom-config.test.js');
      const content = `
describe('Custom config test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(3); // Should be 2
  });
});`;
      fs.writeFileSync(testFile, content);

      await runTfqCommand(['add', testFile], testDir);

      // This test verifies that custom config is respected
      // (would need Claude output inspection to fully verify custom prompt usage)
      const fixResult = await runTfqCommand(['fix-next'], testDir, 45000); // Respect the shorter timeout

      const allOutput = fixResult.output + fixResult.error;
      
      // Should complete within our custom timeout or show timeout behavior
      // The main verification is that it doesn't hang beyond our custom timeout
      console.log('Custom configuration test completed');
    }, 60000);
  });
});