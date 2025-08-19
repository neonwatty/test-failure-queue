export interface QueueItem {
  id: number;
  filePath: string;
  priority: number;
  createdAt: Date;
  failureCount: number;
  lastFailure: Date;
}

export interface QueueStatistics {
  totalItems: number;
  oldestItem: QueueItem | null;
  newestItem: QueueItem | null;
  averageFailureCount: number;
  itemsByPriority: Map<number, number>;
}

export interface DatabaseConfig {
  path?: string;
  verbose?: boolean;
}

export interface QueueOptions {
  databasePath?: string;
  autoCleanup?: boolean;
  maxRetries?: number;
}