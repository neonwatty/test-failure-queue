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
  configPath?: string;
}

export interface ConfigFile {
  databasePath?: string;
  defaultPriority?: number;
  autoCleanup?: boolean;
  maxRetries?: number;
  verbose?: boolean;
  jsonOutput?: boolean;
  colorOutput?: boolean;
}

export type TestFramework = 'jest' | 'mocha' | 'vitest';

export interface TestRunnerOptions {
  framework?: TestFramework;
  command?: string;
}

export interface TestRunResult {
  success: boolean;
  exitCode: number;
  failingTests: string[];
  totalFailures: number;
  duration: number;
  framework: TestFramework;
  command: string;
  stdout: string;
  stderr: string;
  error: string | null;
}