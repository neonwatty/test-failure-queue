import { TestDatabase } from './database.js';
import { QueueItem, QueueOptions, QueueStatistics, ExecutionGroup, GroupingPlan } from './types.js';
import { minimatch } from 'minimatch';
import { loadConfig } from './config.js';
import path from 'path';

export class TestFailureQueue {
  private db: TestDatabase;
  private options: QueueOptions;

  constructor(options: QueueOptions = {}) {
    const config = loadConfig(options.configPath);
    
    this.options = {
      databasePath: options.databasePath || config.databasePath,
      autoCleanup: options.autoCleanup ?? config.autoCleanup,
      maxRetries: options.maxRetries ?? config.maxRetries,
      configPath: options.configPath
    };
    
    this.db = new TestDatabase({
      path: this.options.databasePath,
      verbose: config.verbose || false
    });
  }

  enqueue(filePath: string, priority: number = 0, error?: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }
    
    if (!Number.isInteger(priority)) {
      throw new Error('Priority must be an integer');
    }

    this.db.enqueue(filePath, priority, error);
  }

  dequeue(): string | null {
    return this.db.dequeue();
  }

  peek(): string | null {
    return this.db.peek();
  }

  list(): QueueItem[] {
    return this.db.list();
  }

  remove(filePath: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }
    return this.db.remove(filePath);
  }

  clear(): void {
    this.db.clear();
  }

  size(): number {
    return this.db.size();
  }

  contains(filePath: string): boolean {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }
    return this.db.contains(filePath);
  }

  search(pattern: string): QueueItem[] {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('Pattern must be a non-empty string');
    }
    return this.db.search(pattern);
  }

  searchGlob(pattern: string): QueueItem[] {
    const allItems = this.db.list();
    return allItems.filter(item => minimatch(item.filePath, pattern));
  }

  getStats(): QueueStatistics {
    return this.db.getStats();
  }

  close(): void {
    this.db.close();
  }

  // Grouping methods
  setExecutionGroups(groups: string[][]): void {
    groups.forEach((group, index) => {
      const groupId = index + 1;
      const groupType = group.length > 1 ? 'parallel' : 'sequential';
      
      group.forEach((testFile, orderIndex) => {
        this.db.setTestGroup(testFile, groupId, groupType, orderIndex);
      });
    });
  }

  setExecutionGroupsAdvanced(plan: GroupingPlan): void {
    for (const group of plan.groups) {
      group.tests.forEach((testFile, orderIndex) => {
        this.db.setTestGroup(testFile, group.groupId, group.type, orderIndex);
      });
    }
  }

  dequeueGroup(): string[] | null {
    const filePaths = this.db.dequeueGroup();
    return filePaths.length > 0 ? filePaths : null;
  }

  peekGroup(): QueueItem[] | null {
    const group = this.db.getNextGroup();
    return group ? group.tests : null;
  }

  getGroupingPlan(): GroupingPlan | null {
    const allItems = this.db.list();
    const groupedItems = allItems.filter(item => item.groupId !== undefined);
    
    if (groupedItems.length === 0) {
      return null;
    }

    const groupsMap = new Map<number, { group: ExecutionGroup, items: any[] }>();
    
    for (const item of groupedItems) {
      if (!item.groupId || !item.groupType) continue;
      
      if (!groupsMap.has(item.groupId)) {
        groupsMap.set(item.groupId, {
          group: {
            groupId: item.groupId,
            type: item.groupType,
            tests: [],
            order: item.groupOrder
          },
          items: []
        });
      }
      
      groupsMap.get(item.groupId)!.items.push(item);
    }

    // Sort items within each group by groupOrder and build test arrays
    const groups: ExecutionGroup[] = [];
    groupsMap.forEach(({ group, items }) => {
      items.sort((a, b) => (a.groupOrder || 0) - (b.groupOrder || 0));
      group.tests = items.map(item => item.filePath);
      groups.push(group);
    });

    return {
      groups: groups.sort((a, b) => {
        // Sort by order if present, otherwise by groupId
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return a.groupId - b.groupId;
      })
    };
  }

  hasGroups(): boolean {
    const stats = this.db.getGroupStats();
    return stats.totalGroups > 0;
  }

  clearGroups(): void {
    this.db.clearGroups();
  }

  getGroupStats(): { totalGroups: number; parallelGroups: number; sequentialGroups: number } {
    return this.db.getGroupStats();
  }
}