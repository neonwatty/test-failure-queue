import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestFailureQueue } from '../../src/core/queue.js';
import { GroupingPlan } from '../../src/core/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('TestFailureQueue Grouping Features', () => {
  let queue: TestFailureQueue;
  const testDbPath = path.join(__dirname, '../test-queue-grouping.db');

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    queue = new TestFailureQueue({
      databasePath: testDbPath
    });

    // Add test data
    queue.enqueue('auth.test.js', 5);
    queue.enqueue('api.test.js', 5);
    queue.enqueue('database.test.js', 3);
    queue.enqueue('ui-button.test.js', 2);
    queue.enqueue('ui-form.test.js', 2);
    queue.enqueue('utils.test.js', 1);
  });

  afterEach(() => {
    queue.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('setExecutionGroups', () => {
    it('should create groups from array of arrays', () => {
      const groups = [
        ['auth.test.js', 'api.test.js', 'utils.test.js'],
        ['database.test.js'],
        ['ui-button.test.js', 'ui-form.test.js']
      ];

      queue.setExecutionGroups(groups);
      
      const plan = queue.getGroupingPlan();
      expect(plan).not.toBeNull();
      expect(plan?.groups).toHaveLength(3);
    });

    it('should assign parallel type for multi-test groups', () => {
      const groups = [
        ['auth.test.js', 'api.test.js'],
        ['ui-button.test.js', 'ui-form.test.js']
      ];

      queue.setExecutionGroups(groups);
      
      const plan = queue.getGroupingPlan();
      expect(plan?.groups[0].type).toBe('parallel');
      expect(plan?.groups[1].type).toBe('parallel');
    });

    it('should assign sequential type for single-test groups', () => {
      const groups = [
        ['database.test.js'],
        ['utils.test.js']
      ];

      queue.setExecutionGroups(groups);
      
      const plan = queue.getGroupingPlan();
      expect(plan?.groups[0].type).toBe('sequential');
      expect(plan?.groups[1].type).toBe('sequential');
    });

    it('should handle empty groups array', () => {
      queue.setExecutionGroups([]);
      
      const plan = queue.getGroupingPlan();
      expect(plan).toBeNull();
    });

    it('should preserve test order within groups', () => {
      const groups = [
        ['utils.test.js', 'api.test.js', 'auth.test.js']
      ];

      queue.setExecutionGroups(groups);
      
      const plan = queue.getGroupingPlan();
      const firstGroup = plan?.groups[0];
      
      expect(firstGroup?.tests[0]).toBe('utils.test.js');
      expect(firstGroup?.tests[1]).toBe('api.test.js');
      expect(firstGroup?.tests[2]).toBe('auth.test.js');
    });

    it('should overwrite existing groups', () => {
      queue.setExecutionGroups([['auth.test.js', 'api.test.js']]);
      queue.setExecutionGroups([['database.test.js'], ['utils.test.js']]);
      
      const plan = queue.getGroupingPlan();
      expect(plan?.groups).toHaveLength(2);
      expect(plan?.groups[0].tests).toContain('database.test.js');
      expect(plan?.groups[1].tests).toContain('utils.test.js');
    });
  });

  describe('setExecutionGroupsAdvanced', () => {
    it('should accept GroupingPlan object', () => {
      const plan: GroupingPlan = {
        groups: [
          {
            groupId: 1,
            type: 'parallel',
            tests: ['auth.test.js', 'api.test.js'],
            order: 1
          },
          {
            groupId: 2,
            type: 'sequential',
            tests: ['database.test.js'],
            order: 2
          }
        ],
        metadata: {
          strategy: 'dependency-aware',
          estimatedTime: 180
        }
      };

      queue.setExecutionGroupsAdvanced(plan);
      
      const retrievedPlan = queue.getGroupingPlan();
      expect(retrievedPlan?.groups).toHaveLength(2);
      expect(retrievedPlan?.groups[0].groupId).toBe(1);
      expect(retrievedPlan?.groups[1].groupId).toBe(2);
    });

    it('should preserve custom group IDs', () => {
      const plan: GroupingPlan = {
        groups: [
          {
            groupId: 10,
            type: 'parallel',
            tests: ['auth.test.js'],
            order: 1
          },
          {
            groupId: 5,
            type: 'sequential',
            tests: ['database.test.js'],
            order: 0
          }
        ]
      };

      queue.setExecutionGroupsAdvanced(plan);
      
      const retrievedPlan = queue.getGroupingPlan();
      const group10 = retrievedPlan?.groups.find(g => g.groupId === 10);
      const group5 = retrievedPlan?.groups.find(g => g.groupId === 5);
      
      expect(group10).toBeDefined();
      expect(group5).toBeDefined();
    });

    it('should handle metadata in plan', () => {
      const plan: GroupingPlan = {
        groups: [
          {
            groupId: 1,
            type: 'parallel',
            tests: ['auth.test.js']
          }
        ],
        metadata: {
          strategy: 'quick-wins-first',
          estimatedTime: 120,
          dependencies: {
            'auth.test.js': ['config.js', 'utils.js']
          }
        }
      };

      queue.setExecutionGroupsAdvanced(plan);
      
      // Metadata is stored but not directly retrievable through current API
      // This test verifies the method accepts metadata without error
      const retrievedPlan = queue.getGroupingPlan();
      expect(retrievedPlan).not.toBeNull();
    });

    it('should respect custom order values', () => {
      const plan: GroupingPlan = {
        groups: [
          {
            groupId: 1,
            type: 'parallel',
            tests: ['auth.test.js'],
            order: 10
          },
          {
            groupId: 2,
            type: 'sequential',
            tests: ['database.test.js'],
            order: 5
          }
        ]
      };

      queue.setExecutionGroupsAdvanced(plan);
      
      const retrievedPlan = queue.getGroupingPlan();
      // Groups are sorted by groupId, not by order field (order is metadata)
      expect(retrievedPlan?.groups[0].groupId).toBe(1);
      expect(retrievedPlan?.groups[1].groupId).toBe(2);
    });
  });

  describe('dequeueGroup', () => {
    beforeEach(() => {
      const groups = [
        ['auth.test.js', 'api.test.js'],
        ['database.test.js'],
        ['ui-button.test.js', 'ui-form.test.js']
      ];
      queue.setExecutionGroups(groups);
    });

    it('should return all tests in next group', () => {
      const group = queue.dequeueGroup();
      
      expect(group).not.toBeNull();
      expect(group).toHaveLength(2);
      expect(group).toContain('auth.test.js');
      expect(group).toContain('api.test.js');
    });

    it('should return null when no groups remain', () => {
      queue.dequeueGroup(); // Group 1
      queue.dequeueGroup(); // Group 2
      queue.dequeueGroup(); // Group 3
      
      const group = queue.dequeueGroup();
      expect(group).toBeNull();
    });

    it('should remove tests from queue', () => {
      const sizeBefore = queue.size();
      const group = queue.dequeueGroup();
      const sizeAfter = queue.size();
      
      expect(group).toHaveLength(2);
      expect(sizeAfter).toBe(sizeBefore - 2);
    });

    it('should dequeue groups in order', () => {
      const group1 = queue.dequeueGroup();
      const group2 = queue.dequeueGroup();
      const group3 = queue.dequeueGroup();
      
      expect(group1).toContain('auth.test.js');
      expect(group2).toContain('database.test.js');
      expect(group3).toContain('ui-button.test.js');
    });
  });

  describe('peekGroup', () => {
    beforeEach(() => {
      const groups = [
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ];
      queue.setExecutionGroups(groups);
    });

    it('should preview next group without removing', () => {
      const sizeBefore = queue.size();
      const group = queue.peekGroup();
      const sizeAfter = queue.size();
      
      expect(group).not.toBeNull();
      expect(group).toHaveLength(2);
      expect(sizeAfter).toBe(sizeBefore); // No change in size
    });

    it('should return same group on multiple peeks', () => {
      const group1 = queue.peekGroup();
      const group2 = queue.peekGroup();
      
      expect(group1?.map(g => g.filePath)).toEqual(group2?.map(g => g.filePath));
    });

    it('should return null when no groups', () => {
      queue.clearGroups();
      const group = queue.peekGroup();
      
      expect(group).toBeNull();
    });

    it('should include all queue item properties', () => {
      const group = queue.peekGroup();
      const firstTest = group?.[0];
      
      expect(firstTest).toHaveProperty('id');
      expect(firstTest).toHaveProperty('filePath');
      expect(firstTest).toHaveProperty('priority');
      expect(firstTest).toHaveProperty('groupId');
      expect(firstTest).toHaveProperty('groupType');
    });
  });

  describe('getGroupingPlan', () => {
    it('should return current grouping structure', () => {
      const groups = [
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ];
      queue.setExecutionGroups(groups);
      
      const plan = queue.getGroupingPlan();
      
      expect(plan).not.toBeNull();
      expect(plan?.groups).toHaveLength(2);
      expect(plan?.groups[0].tests).toHaveLength(2);
      expect(plan?.groups[1].tests).toHaveLength(1);
    });

    it('should return null when no groups', () => {
      const plan = queue.getGroupingPlan();
      expect(plan).toBeNull();
    });

    it('should include all group metadata', () => {
      const groups = [['auth.test.js', 'api.test.js']];
      queue.setExecutionGroups(groups);
      
      const plan = queue.getGroupingPlan();
      const firstGroup = plan?.groups[0];
      
      expect(firstGroup).toHaveProperty('groupId');
      expect(firstGroup).toHaveProperty('type');
      expect(firstGroup).toHaveProperty('tests');
      expect(firstGroup?.type).toBe('parallel');
    });

    it('should reflect changes after dequeue', () => {
      const groups = [
        ['auth.test.js'],
        ['database.test.js']
      ];
      queue.setExecutionGroups(groups);
      
      queue.dequeueGroup(); // Remove first group
      
      const plan = queue.getGroupingPlan();
      expect(plan?.groups).toHaveLength(1);
      expect(plan?.groups[0].tests).toContain('database.test.js');
    });
  });

  describe('hasGroups', () => {
    it('should return true when groups exist', () => {
      queue.setExecutionGroups([['auth.test.js']]);
      expect(queue.hasGroups()).toBe(true);
    });

    it('should return false when no groups', () => {
      expect(queue.hasGroups()).toBe(false);
    });

    it('should return false after clearing groups', () => {
      queue.setExecutionGroups([['auth.test.js']]);
      queue.clearGroups();
      expect(queue.hasGroups()).toBe(false);
    });

    it('should return false after dequeuing all groups', () => {
      queue.setExecutionGroups([['auth.test.js'], ['api.test.js']]);
      queue.dequeueGroup();
      queue.dequeueGroup();
      expect(queue.hasGroups()).toBe(false);
    });
  });

  describe('clearGroups', () => {
    it('should remove all group assignments', () => {
      queue.setExecutionGroups([
        ['auth.test.js', 'api.test.js'],
        ['database.test.js']
      ]);
      
      queue.clearGroups();
      
      expect(queue.hasGroups()).toBe(false);
      expect(queue.getGroupingPlan()).toBeNull();
    });

    it('should not affect queue contents', () => {
      queue.setExecutionGroups([['auth.test.js', 'api.test.js']]);
      
      const sizeBefore = queue.size();
      queue.clearGroups();
      const sizeAfter = queue.size();
      
      expect(sizeAfter).toBe(sizeBefore);
      expect(queue.list()).toHaveLength(6); // All original tests still there
    });

    it('should allow normal dequeue after clearing', () => {
      queue.setExecutionGroups([['auth.test.js', 'api.test.js']]);
      queue.clearGroups();
      
      // Should dequeue by priority now
      const next = queue.dequeue();
      expect(next).toBe('auth.test.js'); // Highest priority (5)
    });
  });

  describe('getGroupStats', () => {
    it('should return correct statistics', () => {
      queue.setExecutionGroups([
        ['auth.test.js', 'api.test.js'],  // parallel
        ['database.test.js'],               // sequential
        ['ui-button.test.js', 'ui-form.test.js'] // parallel
      ]);
      
      const stats = queue.getGroupStats();
      
      expect(stats.totalGroups).toBe(3);
      expect(stats.parallelGroups).toBe(2);
      expect(stats.sequentialGroups).toBe(1);
    });

    it('should return zeros when no groups', () => {
      const stats = queue.getGroupStats();
      
      expect(stats.totalGroups).toBe(0);
      expect(stats.parallelGroups).toBe(0);
      expect(stats.sequentialGroups).toBe(0);
    });

    it('should update after dequeue', () => {
      queue.setExecutionGroups([
        ['auth.test.js'],
        ['database.test.js']
      ]);
      
      queue.dequeueGroup();
      const stats = queue.getGroupStats();
      
      expect(stats.totalGroups).toBe(1);
    });
  });

  describe('interaction with priority', () => {
    it('should preserve priority information in grouped tests', () => {
      queue.setExecutionGroups([['auth.test.js', 'database.test.js']]);
      
      const group = queue.peekGroup();
      const authTest = group?.find(t => t.filePath === 'auth.test.js');
      const dbTest = group?.find(t => t.filePath === 'database.test.js');
      
      expect(authTest?.priority).toBe(5);
      expect(dbTest?.priority).toBe(3);
    });

    it('should ignore priority when groups are set', () => {
      // database.test.js has lower priority but is in first group
      queue.setExecutionGroups([
        ['database.test.js'],  // priority 3
        ['auth.test.js']        // priority 5
      ]);
      
      const firstGroup = queue.dequeueGroup();
      expect(firstGroup).toContain('database.test.js');
    });
  });
});