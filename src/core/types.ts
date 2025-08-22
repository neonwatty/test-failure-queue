export interface QueueItem {
  id: number;
  filePath: string;
  priority: number;
  createdAt: Date;
  failureCount: number;
  lastFailure: Date;
  error?: string;
  groupId?: number;
  groupType?: 'parallel' | 'sequential';
  groupOrder?: number;
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
  defaultLanguage?: TestLanguage;
  defaultFrameworks?: Record<TestLanguage, TestFramework>;
  testCommands?: Record<string, string>;
}

export type TestLanguage = 'javascript' | 'ruby' | 'python' | 'go' | 'java';

export type TestFramework = string;

export interface TestRunnerOptions {
  language?: TestLanguage;
  framework?: TestFramework;
  command?: string;
  autoDetect?: boolean;
  skipUnsupportedCheck?: boolean;
  verbose?: boolean;
}

export interface TestRunResult {
  success: boolean;
  exitCode: number;
  failingTests: string[];
  totalFailures: number;
  duration: number;
  language: TestLanguage;
  framework: TestFramework;
  command: string;
  stdout: string;
  stderr: string;
  error: string | null;
  failureDetails?: Record<string, { error: string; line?: number }>;
}

export interface AdapterInfo {
  language: TestLanguage;
  supportedFrameworks: string[];
  defaultFramework: string;
}

export interface AdapterRegistry {
  register(language: TestLanguage, adapter: any): void;
  get(language: TestLanguage): any;
  list(): AdapterInfo[];
  detectLanguage(projectPath?: string): TestLanguage | null;
  getFrameworksForLanguage(language: TestLanguage): string[];
}

export interface ExecutionGroup {
  groupId: number;
  type: 'parallel' | 'sequential';
  tests: string[];
  order?: number;
}

export interface GroupingPlan {
  groups: ExecutionGroup[];
  metadata?: {
    strategy?: string;
    estimatedTime?: number;
    dependencies?: Record<string, string[]>;
  };
}