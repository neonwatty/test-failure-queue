export interface ClaudeConfig {
  enabled: boolean;
  claudePath?: string;
  maxIterations?: number;
  testTimeout?: number;  // Per-test timeout in ms
  prompt?: string;
}

export interface ClaudeFixResult {
  success: boolean;
  error?: string;
  duration: number;
  iterations?: number;
}

export interface ClaudeValidationResult {
  isValid: boolean;
  error?: string;
  claudePath?: string;
}