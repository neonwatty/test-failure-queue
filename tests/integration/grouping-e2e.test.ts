import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = path.join(__dirname, '../../bin/tfq');
const TEST_DB_PATH = path.join(__dirname, '../test-e2e-grouping.db');

describe('Grouping End-to-End Workflows', () => {
  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    
    // Set environment variable to use test database
    process.env.TFQ_DB_PATH = TEST_DB_PATH;
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    delete process.env.TFQ_DB_PATH;
  });

  async function runCommand(args: string): Promise<{ stdout: string; stderr: string }> {
    return execAsync(`node ${CLI_PATH} ${args}`, {
      env: { ...process.env, TFQ_DB_PATH: TEST_DB_PATH }
    });
  }

  describe('Parallel Execution Benefits', () => {
    it('should demonstrate parallel execution benefits', async () => {
      // Add test files that could be parallelized
      const testFiles = [
        'unit/auth.test.js',
        'unit/api.test.js',
        'unit/utils.test.js',
        'unit/validator.test.js',
        'unit/formatter.test.js'
      ];

      for (const file of testFiles) {
        await runCommand(`add ${file} --priority 5`);
      }

      // Set up groups for parallel execution
      const groups = JSON.stringify([
        testFiles // All in one parallel group
      ]);

      await runCommand(`set-groups --json '${groups}'`);

      // Verify group type is parallel
      const { stdout: groupInfo } = await runCommand('get-groups --json');
      const plan = JSON.parse(groupInfo);
      
      expect(plan.groups).toHaveLength(1);
      expect(plan.groups[0].type).toBe('parallel');
      expect(plan.groups[0].tests).toHaveLength(5);

      // Dequeue the group
      const { stdout: dequeuedOutput } = await runCommand('next --group --json');
      const dequeued = JSON.parse(dequeuedOutput);
      
      expect(dequeued.type).toBe('parallel');
      expect(dequeued.tests).toHaveLength(5);
      
      // In a real scenario, these would be executed in parallel
      // reducing total execution time significantly
    });
  });

  describe('Sequential Execution for Conflicts', () => {
    it('should prevent conflicts in sequential groups', async () => {
      // Add test files that share resources
      const databaseTests = [
        'integration/db-create.test.js',
        'integration/db-update.test.js',
        'integration/db-delete.test.js'
      ];

      for (const file of databaseTests) {
        await runCommand(`add ${file} --priority 3`);
      }

      // Each database test in its own sequential group
      const groups = JSON.stringify(
        databaseTests.map(test => [test])
      );

      await runCommand(`set-groups --json '${groups}'`);

      // Verify all groups are sequential
      const { stdout: groupInfo } = await runCommand('get-groups --json');
      const plan = JSON.parse(groupInfo);
      
      expect(plan.groups).toHaveLength(3);
      plan.groups.forEach(group => {
        expect(group.type).toBe('sequential');
        expect(group.tests).toHaveLength(1);
      });

      // Dequeue groups one by one
      for (let i = 0; i < databaseTests.length; i++) {
        const { stdout } = await runCommand('next --group --json');
        const group = JSON.parse(stdout);
        
        expect(group.type).toBe('sequential');
        expect(group.tests).toHaveLength(1);
        expect(databaseTests.some(test => group.tests[0].endsWith(test))).toBe(true);
      }
    });
  });

  describe('Mixed Parallel/Sequential Groups', () => {
    it('should handle mixed parallel/sequential groups', async () => {
      // Add various test files
      const unitTests = ['auth.test.js', 'api.test.js', 'utils.test.js'];
      const dbTests = ['db.test.js'];
      const uiTests = ['button.test.js', 'form.test.js'];

      for (const file of unitTests) {
        await runCommand(`add unit/${file} --priority 5`);
      }
      for (const file of dbTests) {
        await runCommand(`add integration/${file} --priority 3`);
      }
      for (const file of uiTests) {
        await runCommand(`add ui/${file} --priority 2`);
      }

      // Set up mixed groups
      const groups = JSON.stringify([
        unitTests.map(f => `unit/${f}`),     // Parallel group
        dbTests.map(f => `integration/${f}`), // Sequential group (1 test)
        uiTests.map(f => `ui/${f}`)          // Parallel group
      ]);

      await runCommand(`set-groups --json '${groups}'`);

      // Verify group configuration
      const { stdout: statsOutput } = await runCommand('group-stats --json');
      const stats = JSON.parse(statsOutput);
      
      expect(stats.totalGroups).toBe(3);
      expect(stats.parallelGroups).toBe(2);
      expect(stats.sequentialGroups).toBe(1);

      // Execute groups
      const executedGroups = [];
      for (let i = 0; i < 3; i++) {
        const { stdout } = await runCommand('next --group --json');
        executedGroups.push(JSON.parse(stdout));
      }

      // Verify execution order and types
      expect(executedGroups[0].type).toBe('parallel');
      expect(executedGroups[0].tests).toHaveLength(3);
      
      expect(executedGroups[1].type).toBe('sequential');
      expect(executedGroups[1].tests).toHaveLength(1);
      
      expect(executedGroups[2].type).toBe('parallel');
      expect(executedGroups[2].tests).toHaveLength(2);
    });
  });

  describe('Cross-Language Support', () => {
    it('should work across different language test files', async () => {
      // Add test files from different languages
      const jsTests = ['auth.test.js', 'api.test.js'];
      const pyTests = ['test_database.py', 'test_utils.py'];
      const rbTests = ['calculator_test.rb', 'validator_test.rb'];

      for (const file of jsTests) {
        await runCommand(`add js/${file}`);
      }
      for (const file of pyTests) {
        await runCommand(`add python/${file}`);
      }
      for (const file of rbTests) {
        await runCommand(`add ruby/${file}`);
      }

      // Group by language for parallel execution within language
      const groups = JSON.stringify([
        jsTests.map(f => `js/${f}`),
        pyTests.map(f => `python/${f}`),
        rbTests.map(f => `ruby/${f}`)
      ]);

      await runCommand(`set-groups --json '${groups}'`);

      // Verify groups
      const { stdout: groupsOutput } = await runCommand('get-groups --json');
      const plan = JSON.parse(groupsOutput);
      
      expect(plan.groups).toHaveLength(3);
      
      // Each language group can be executed in parallel
      plan.groups.forEach(group => {
        expect(group.type).toBe('parallel');
        expect(group.tests).toHaveLength(2);
      });
    });
  });

  describe('Group Persistence', () => {
    it('should persist groups across sessions', async () => {
      // Add test files
      await runCommand('add test1.js');
      await runCommand('add test2.js');
      
      // Set groups
      const groups = JSON.stringify([['test1.js', 'test2.js']]);
      await runCommand(`set-groups --json '${groups}'`);
      
      // Verify groups exist
      const { stdout: before } = await runCommand('group-stats --json');
      const statsBefore = JSON.parse(before);
      expect(statsBefore.totalGroups).toBe(1);
      
      // Simulate new session by creating new queue instance
      // (In real usage, this would be closing and reopening the CLI)
      // The database persists, so groups should still be there
      
      const { stdout: after } = await runCommand('group-stats --json');
      const statsAfter = JSON.parse(after);
      expect(statsAfter.totalGroups).toBe(1);
    });
  });

  describe('Automatic Group Clearing', () => {
    it('should handle groups when queue becomes empty', async () => {
      // Add test files
      await runCommand('add test1.js');
      await runCommand('add test2.js');
      
      // Set groups
      const groups = JSON.stringify([['test1.js'], ['test2.js']]);
      await runCommand(`set-groups --json '${groups}'`);
      
      // Dequeue all groups
      await runCommand('next --group');
      await runCommand('next --group');
      
      // Queue is now empty
      const { stdout: listOutput } = await runCommand('list --json');
      const list = JSON.parse(listOutput);
      expect(list.items).toHaveLength(0);
      
      // Groups should still exist but have no effect
      const { stdout: statsOutput } = await runCommand('group-stats --json');
      const stats = JSON.parse(statsOutput);
      expect(stats.totalGroups).toBe(0); // No groups with actual tests
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize execution order based on grouping', async () => {
      // Add test files with different priorities
      const quickTests = ['quick1.test.js', 'quick2.test.js', 'quick3.test.js'];
      const slowTests = ['slow1.test.js', 'slow2.test.js'];
      const criticalTest = ['critical.test.js'];

      for (const file of quickTests) {
        await runCommand(`add ${file} --priority 1`); // Low priority
      }
      for (const file of slowTests) {
        await runCommand(`add ${file} --priority 5`); // High priority
      }
      for (const file of criticalTest) {
        await runCommand(`add ${file} --priority 10`); // Highest priority
      }

      // Group quick tests together for parallel execution
      // Keep slow tests sequential
      // Critical test runs first (alone)
      const groups = JSON.stringify([
        criticalTest,  // First group (highest priority item)
        quickTests,     // Second group (parallel, quick wins)
        ...slowTests.map(t => [t]) // Individual sequential groups
      ]);

      await runCommand(`set-groups --json '${groups}'`);

      // Execute and verify order
      const executionOrder = [];
      
      try {
        while (true) {
          const { stdout } = await runCommand('next --group --json');
          const group = JSON.parse(stdout);
          executionOrder.push(group);
        }
      } catch {
        // Expected to fail when no more groups
      }

      // Verify execution order optimizes for quick feedback
      expect(executionOrder[0].tests.every(t => criticalTest.some(ct => t.endsWith(ct)))).toBe(true);
      expect(executionOrder[0].tests).toHaveLength(criticalTest.length);
      expect(executionOrder[1].tests).toHaveLength(3); // All quick tests in parallel
      expect(executionOrder[1].type).toBe('parallel');
      
      // Slow tests run last, one at a time
      expect(executionOrder[2].tests).toHaveLength(1);
      expect(executionOrder[3].tests).toHaveLength(1);
    });
  });

  describe('Error Recovery', () => {
    it('should handle partial group execution', async () => {
      // Add test files
      const tests = ['test1.js', 'test2.js', 'test3.js', 'test4.js'];
      for (const test of tests) {
        await runCommand(`add ${test}`);
      }

      // Set groups
      const groups = JSON.stringify([
        ['test1.js', 'test2.js'],
        ['test3.js', 'test4.js']
      ]);
      await runCommand(`set-groups --json '${groups}'`);

      // Dequeue first group
      await runCommand('next --group');

      // Simulate failure - re-add one test from the executed group
      await runCommand('add test1.js --priority 10');

      // The re-added test should not be in a group
      const { stdout: listOutput } = await runCommand('list --json');
      const list = JSON.parse(listOutput);
      
      // Should have test1.js (re-added) and group 2 still pending
      expect(list.items.some(item => item.filePath.endsWith('test1.js'))).toBe(true);
      
      // Can still dequeue the second group
      const { stdout: groupOutput } = await runCommand('next --group --json');
      const group = JSON.parse(groupOutput);
      expect(group.tests.some(t => t.endsWith('test3.js'))).toBe(true);
      expect(group.tests.some(t => t.endsWith('test4.js'))).toBe(true);
      
      // Then can dequeue the individual re-added test
      const { stdout: nextOutput } = await runCommand('next');
      expect(nextOutput.trim().endsWith('test1.js')).toBe(true);
    });
  });
});