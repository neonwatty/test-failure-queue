export interface ClaudeResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface FixResponse {
  success: boolean;
  changes: CodeChange[];
  explanation?: string;
  error?: string;
}

export interface TestFixerConfig {
  maxRetries?: number;
  maxIterations?: number;
  systemPrompt?: string;
  verbose?: boolean;
  dryRun?: boolean;
  useClaudeCodeSDK?: boolean;
}

export interface FixAttempt {
  testFile: string;
  attemptNumber: number;
  success: boolean;
  error?: string;
  changes?: CodeChange[];
  timeElapsed: number;
}

export interface CodeChange {
  file: string;
  originalContent: string;
  newContent: string;
}

export interface FixResult {
  totalTests: number;
  fixedTests: number;
  failedTests: number;
  skippedTests: number;
  attempts: FixAttempt[];
  totalTime: number;
}

export interface QueueProcessResult {
  processed: number;
  fixed: number;
  failed: number;
  remaining: number;
}

export interface FixPrompt {
  testFile: string;
  testContent: string;
  errorOutput: string;
  relatedFiles: { path: string; content: string }[];
  language: string;
  framework: string;
  systemPrompt?: string;
}