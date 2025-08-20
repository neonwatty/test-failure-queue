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