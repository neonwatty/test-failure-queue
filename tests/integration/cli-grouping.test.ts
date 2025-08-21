import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = path.join(__dirname, '../../bin/tfq');
const TEST_DB_PATH = path.join(__dirname, '../test-cli-grouping.db');

describe('CLI Grouping Commands (Integration)', () => {
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

  async function addTestFiles() {
    await runCommand('add auth.test.js --priority 5');
    await runCommand('add api.test.js --priority 5');
    await runCommand('add database.test.js --priority 3');
    await runCommand('add ui-button.test.js --priority 2');
    await runCommand('add ui-form.test.js --priority 2');
    await runCommand('add utils.test.js --priority 1');
  }

  describe('set-groups command', () => {
    beforeEach(async () => {
      await addTestFiles();
    });

    it('should accept JSON input for groups', async () => {
      const groups = JSON.stringify([
        ['auth.test.js', 'api.test.js'],
        ['database.test.js'],
        ['ui-button.test.js', 'ui-form.test.js']
      ]);

      const { stdout } = await runCommand(`set-groups --json '${groups}'`);
      
      expect(stdout).toContain('Groups set successfully');
      expect(stdout).toContain('Total groups: 3');
    });

    it('should accept file input for groups', async () => {
      const groupFile = path.join(__dirname, 'test-groups.json');
      const groups = [
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ];
      
      fs.writeFileSync(groupFile, JSON.stringify(groups));
      
      try {
        const { stdout } = await runCommand(`set-groups --file ${groupFile}`);
        expect(stdout).toContain('Groups set successfully');
        expect(stdout).toContain('Total groups: 2');
      } finally {
        fs.unlinkSync(groupFile);
      }
    });

    it('should handle advanced GroupingPlan format', async () => {
      const plan = JSON.stringify({
        groups: [
          {
            groupId: 1,
            type: 'parallel',
            tests: ['auth.test.js', 'api.test.js']
          },
          {
            groupId: 2,
            type: 'sequential',
            tests: ['database.test.js']
          }
        ]
      });

      const { stdout } = await runCommand(`set-groups --json '${plan}'`);
      
      expect(stdout).toContain('Groups set successfully');
      expect(stdout).toContain('Parallel groups: 1');
      expect(stdout).toContain('Sequential groups: 1');
    });

    it('should error on invalid JSON', async () => {
      try {
        await runCommand(`set-groups --json 'invalid json'`);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('Error');
      }
    });

    it('should error when neither --json nor --file is provided', async () => {
      try {
        await runCommand('set-groups');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('Either --json or --file option is required');
      }
    });
  });

  describe('get-groups command', () => {
    beforeEach(async () => {
      await addTestFiles();
    });

    it('should display groups in human-readable format', async () => {
      const groups = JSON.stringify([
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ]);
      
      await runCommand(`set-groups --json '${groups}'`);
      const { stdout } = await runCommand('get-groups');
      
      expect(stdout).toContain('Execution Groups:');
      expect(stdout).toContain('Group 1');
      expect(stdout).toContain('⚡'); // Parallel icon
      expect(stdout).toContain('auth.test.js');
      expect(stdout).toContain('api.test.js');
      expect(stdout).toContain('Group 2');
      expect(stdout).toContain('→'); // Sequential icon
      expect(stdout).toContain('database.test.js');
    });

    it('should output JSON format when requested', async () => {
      const groups = [
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ];
      
      await runCommand(`set-groups --json '${JSON.stringify(groups)}'`);
      const { stdout } = await runCommand('get-groups --json');
      
      const result = JSON.parse(stdout);
      expect(result.success).toBe(true);
      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].tests.some(t => t.endsWith('auth.test.js'))).toBe(true);
      expect(result.groups[0].tests.some(t => t.endsWith('api.test.js'))).toBe(true);
      expect(result.groups[0].type).toBe('parallel');
      expect(result.groups[1].tests.some(t => t.endsWith('database.test.js'))).toBe(true);
      expect(result.groups[1].type).toBe('sequential');
    });

    it('should show "no groups" message when empty', async () => {
      const { stdout } = await runCommand('get-groups');
      expect(stdout).toContain('No groups configured');
    });
  });

  describe('next --group command', () => {
    beforeEach(async () => {
      await addTestFiles();
    });

    it('should dequeue entire group', async () => {
      const groups = JSON.stringify([
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ]);
      
      await runCommand(`set-groups --json '${groups}'`);
      
      // Dequeue first group
      const { stdout: stdout1 } = await runCommand('next --group');
      expect(stdout1).toContain('auth.test.js');
      expect(stdout1).toContain('api.test.js');
      
      // Dequeue second group
      const { stdout: stdout2 } = await runCommand('next --group');
      expect(stdout2).toContain('database.test.js');
      
      // No more groups
      try {
        await runCommand('next --group');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stdout).toContain('No groups available');
      }
    });

    it('should return group type in JSON format', async () => {
      const groups = JSON.stringify([
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ]);
      
      await runCommand(`set-groups --json '${groups}'`);
      
      const { stdout } = await runCommand('next --group --json');
      const result = JSON.parse(stdout);
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('parallel');
      expect(result.tests.some(t => t.endsWith('auth.test.js'))).toBe(true);
      expect(result.tests.some(t => t.endsWith('api.test.js'))).toBe(true);
    });

    it('should handle empty queue', async () => {
      try {
        await runCommand('next --group');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stdout).toContain('No groups available');
      }
    });
  });

  describe('peek --group command', () => {
    beforeEach(async () => {
      await addTestFiles();
    });

    it('should preview next group without removing', async () => {
      const groups = JSON.stringify([
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ]);
      
      await runCommand(`set-groups --json '${groups}'`);
      
      // Peek at first group
      const { stdout: stdout1 } = await runCommand('peek --group');
      expect(stdout1).toContain('Next group (parallel)');
      expect(stdout1).toContain('auth.test.js');
      expect(stdout1).toContain('api.test.js');
      
      // Peek again - should be same group
      const { stdout: stdout2 } = await runCommand('peek --group');
      expect(stdout2).toContain('auth.test.js');
      expect(stdout2).toContain('api.test.js');
      
      // Verify list still shows all items
      const { stdout: listOutput } = await runCommand('list --json');
      const list = JSON.parse(listOutput);
      expect(list.items).toHaveLength(6);
    });

    it('should return JSON format when requested', async () => {
      const groups = JSON.stringify([['database.test.js']]);
      
      await runCommand(`set-groups --json '${groups}'`);
      
      const { stdout } = await runCommand('peek --group --json');
      const result = JSON.parse(stdout);
      
      expect(result.success).toBe(true);
      expect(result.type).toBe('sequential');
      expect(result.tests.some(t => t.endsWith('database.test.js'))).toBe(true);
    });
  });

  describe('clear-groups command', () => {
    beforeEach(async () => {
      await addTestFiles();
    });

    it('should clear all grouping data', async () => {
      const groups = JSON.stringify([
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ]);
      
      await runCommand(`set-groups --json '${groups}'`);
      
      // Verify groups exist
      const { stdout: beforeClear } = await runCommand('group-stats --json');
      const statsBefore = JSON.parse(beforeClear);
      expect(statsBefore.totalGroups).toBe(2);
      
      // Clear groups
      const { stdout } = await runCommand('clear-groups --confirm');
      expect(stdout).toContain('Cleared 2 group(s)');
      
      // Verify groups are gone
      const { stdout: afterClear } = await runCommand('group-stats --json');
      const statsAfter = JSON.parse(afterClear);
      expect(statsAfter.totalGroups).toBe(0);
    });

    it('should not affect queue contents', async () => {
      const groups = JSON.stringify([['auth.test.js']]);
      
      await runCommand(`set-groups --json '${groups}'`);
      
      // Get queue size before clear
      const { stdout: before } = await runCommand('list --json');
      const listBefore = JSON.parse(before);
      const sizeBefore = listBefore.items.length;
      
      // Clear groups
      await runCommand('clear-groups --confirm');
      
      // Get queue size after clear
      const { stdout: after } = await runCommand('list --json');
      const listAfter = JSON.parse(after);
      const sizeAfter = listAfter.items.length;
      
      expect(sizeAfter).toBe(sizeBefore);
    });

    it('should show message when no groups to clear', async () => {
      const { stdout } = await runCommand('clear-groups --confirm');
      expect(stdout).toContain('No groups to clear');
    });
  });

  describe('group-stats command', () => {
    beforeEach(async () => {
      await addTestFiles();
    });

    it('should show grouping statistics', async () => {
      const groups = JSON.stringify([
        ['auth.test.js', 'api.test.js'],  // parallel
        ['database.test.js'],               // sequential
        ['ui-button.test.js', 'ui-form.test.js'] // parallel
      ]);
      
      await runCommand(`set-groups --json '${groups}'`);
      
      const { stdout } = await runCommand('group-stats');
      
      expect(stdout).toContain('Grouping Statistics');
      expect(stdout).toContain('Total groups: 3');
      expect(stdout).toContain('Parallel groups: 2');
      expect(stdout).toContain('Sequential groups: 1');
    });

    it('should output JSON format when requested', async () => {
      const groups = JSON.stringify([
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ]);
      
      await runCommand(`set-groups --json '${groups}'`);
      
      const { stdout } = await runCommand('group-stats --json');
      const result = JSON.parse(stdout);
      
      expect(result.success).toBe(true);
      expect(result.totalGroups).toBe(2);
      expect(result.parallelGroups).toBe(1);
      expect(result.sequentialGroups).toBe(1);
    });

    it('should show zeros when no groups', async () => {
      const { stdout } = await runCommand('group-stats --json');
      const result = JSON.parse(stdout);
      
      expect(result.totalGroups).toBe(0);
      expect(result.parallelGroups).toBe(0);
      expect(result.sequentialGroups).toBe(0);
    });
  });

  describe('complete workflow', () => {
    it('should handle full grouping workflow', async () => {
      // Add test files
      await addTestFiles();
      
      // Set groups
      const groups = JSON.stringify([
        ['auth.test.js', 'api.test.js', 'utils.test.js'],
        ['database.test.js'],
        ['ui-button.test.js', 'ui-form.test.js']
      ]);
      await runCommand(`set-groups --json '${groups}'`);
      
      // Verify groups were set
      const { stdout: statsOutput } = await runCommand('group-stats --json');
      const stats = JSON.parse(statsOutput);
      expect(stats.totalGroups).toBe(3);
      
      // Dequeue first group
      const { stdout: group1Output } = await runCommand('next --group --json');
      const group1 = JSON.parse(group1Output);
      expect(group1.tests).toHaveLength(3);
      expect(group1.type).toBe('parallel');
      
      // Dequeue second group
      const { stdout: group2Output } = await runCommand('next --group --json');
      const group2 = JSON.parse(group2Output);
      expect(group2.tests).toHaveLength(1);
      expect(group2.type).toBe('sequential');
      
      // Dequeue third group
      const { stdout: group3Output } = await runCommand('next --group --json');
      const group3 = JSON.parse(group3Output);
      expect(group3.tests).toHaveLength(2);
      expect(group3.type).toBe('parallel');
      
      // Verify queue is empty
      const { stdout: listOutput } = await runCommand('list --json');
      const list = JSON.parse(listOutput);
      expect(list.items).toHaveLength(0);
    });

    it('should maintain backward compatibility with non-grouped operations', async () => {
      // Add test files
      await addTestFiles();
      
      // Set groups for some files
      const groups = JSON.stringify([
        ['auth.test.js', 'api.test.js']
      ]);
      await runCommand(`set-groups --json '${groups}'`);
      
      // Clear groups
      await runCommand('clear-groups --confirm');
      
      // Regular dequeue should work by priority
      const { stdout: next1 } = await runCommand('next');
      expect(next1.trim().endsWith('auth.test.js')).toBe(true); // Priority 5
      
      const { stdout: next2 } = await runCommand('next');
      expect(next2.trim().endsWith('api.test.js')).toBe(true); // Priority 5
      
      const { stdout: next3 } = await runCommand('next');
      expect(next3.trim().endsWith('database.test.js')).toBe(true); // Priority 3
    });

    it('should work with priority ordering when groups are not set', async () => {
      // Add files with different priorities
      await runCommand('add high.test.js --priority 10');
      await runCommand('add medium.test.js --priority 5');
      await runCommand('add low.test.js --priority 1');
      
      // Without groups, should dequeue by priority
      const { stdout: next1 } = await runCommand('next');
      expect(next1.trim().endsWith('high.test.js')).toBe(true);
      
      const { stdout: next2 } = await runCommand('next');
      expect(next2.trim().endsWith('medium.test.js')).toBe(true);
      
      const { stdout: next3 } = await runCommand('next');
      expect(next3.trim().endsWith('low.test.js')).toBe(true);
    });
  });
});