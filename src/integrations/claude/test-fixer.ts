import { TestFailureQueue } from '../../core/queue.js';
import { TestRunner } from '../../core/test-runner.js';
import { ClaudeCodeClient } from './claude-code-client.js';
import { QueueItem } from '../../core/types.js';
import {
  TestFixerConfig,
  FixAttempt,
  CodeChange,
  FixResult,
  QueueProcessResult,
  FixPrompt
} from './types.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export type { 
  TestFixerConfig,
  FixAttempt,
  CodeChange,
  FixResult,
  QueueProcessResult,
  FixPrompt
} from './types.js';

export class TestFixer {
  private queue: TestFailureQueue;
  private runner: TestRunner;
  private claude: ClaudeCodeClient;
  private config: Required<TestFixerConfig>;
  private fixHistory: Map<string, FixAttempt[]> = new Map();

  constructor(
    queue: TestFailureQueue,
    runner: TestRunner,
    config: TestFixerConfig = {}
  ) {
    this.queue = queue;
    this.runner = runner;
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      maxIterations: config.maxIterations ?? 10,
      systemPrompt: config.systemPrompt ?? this.getDefaultSystemPrompt(),
      apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
      verbose: config.verbose ?? false,
      dryRun: config.dryRun ?? false,
      useClaudeCodeSDK: config.useClaudeCodeSDK ?? false,
    };

    if (!this.config.apiKey) {
      throw new Error(
        'API key is required. Set ANTHROPIC_API_KEY environment variable or pass apiKey in config.'
      );
    }

    this.claude = new ClaudeCodeClient(this.config.apiKey);
  }

  async fixFailedTests(): Promise<FixResult> {
    const startTime = Date.now();
    const result: FixResult = {
      totalTests: 0,
      fixedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      attempts: [],
      totalTime: 0,
    };

    const queueSize = this.queue.size();
    result.totalTests = queueSize;

    if (queueSize === 0) {
      this.log('No failed tests in queue', 'info');
      return result;
    }

    this.log(`Starting to fix ${queueSize} failed tests`, 'info');

    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      this.log(`\nIteration ${iteration + 1}/${this.config.maxIterations}`, 'info');
      
      const processResult = await this.processQueue();
      result.fixedTests += processResult.fixed;
      result.failedTests += processResult.failed;

      if (processResult.remaining === 0) {
        this.log('All tests processed', 'success');
        break;
      }

      if (processResult.processed === 0) {
        this.log('No progress made in this iteration', 'warning');
        result.skippedTests = processResult.remaining;
        break;
      }
    }

    result.totalTime = Date.now() - startTime;
    result.attempts = Array.from(this.fixHistory.values()).flat();

    return result;
  }

  async processQueue(): Promise<QueueProcessResult> {
    const result: QueueProcessResult = {
      processed: 0,
      fixed: 0,
      failed: 0,
      remaining: 0,
    };

    const items = this.queue.list();
    result.remaining = items.length;

    for (const item of items) {
      const testFile = item.filePath;
      
      if (this.hasReachedMaxRetries(testFile)) {
        this.log(`Skipping ${testFile} - max retries reached`, 'warning');
        continue;
      }

      this.log(`\nProcessing: ${testFile}`, 'info');
      result.processed++;

      const attemptResult = await this.attemptFix(testFile, item);
      
      if (attemptResult.success) {
        result.fixed++;
        result.remaining--;
        this.queue.dequeue();
        this.log(`✓ Fixed: ${testFile}`, 'success');
      } else {
        result.failed++;
        this.log(`✗ Failed to fix: ${testFile}`, 'error');
        
        if (this.hasReachedMaxRetries(testFile)) {
          this.queue.dequeue();
          result.remaining--;
        }
      }
    }

    return result;
  }

  async attemptFix(testFile: string, queueItem: QueueItem): Promise<FixAttempt> {
    const startTime = Date.now();
    const attemptNumber = (this.fixHistory.get(testFile)?.length ?? 0) + 1;
    
    const attempt: FixAttempt = {
      testFile,
      attemptNumber,
      success: false,
      timeElapsed: 0,
    };

    try {
      const prompt = await this.generateFixPrompt(testFile, queueItem);
      
      this.log(`Requesting fix from Claude (attempt ${attemptNumber})`, 'debug');
      
      if (this.config.dryRun) {
        this.log('Dry run mode - skipping actual fix', 'info');
        attempt.success = false;
        attempt.error = 'Dry run mode';
      } else {
        const response = await this.claude.requestFix(prompt);
        const changes = this.claude.parseResponse(response);
        
        attempt.changes = changes;
        
        await this.applyChanges(changes);
        
        const testResult = await this.runner.runTests({
          pattern: testFile,
          captureOutput: true,
        });
        
        attempt.success = testResult.totalFailures === 0;
        
        if (!attempt.success) {
          await this.revertChanges(changes);
          attempt.error = 'Tests still failing after fix';
        }
      }
    } catch (error) {
      attempt.error = error instanceof Error ? error.message : String(error);
      this.log(`Error during fix attempt: ${attempt.error}`, 'error');
    }

    attempt.timeElapsed = Date.now() - startTime;
    
    if (!this.fixHistory.has(testFile)) {
      this.fixHistory.set(testFile, []);
    }
    this.fixHistory.get(testFile)!.push(attempt);

    return attempt;
  }

  async generateFixPrompt(testFile: string, queueItem: QueueItem): Promise<FixPrompt> {
    const testContent = fs.readFileSync(testFile, 'utf-8');
    const relatedFiles = await this.findRelatedFiles(testFile);
    
    const prompt: FixPrompt = {
      testFile,
      testContent,
      errorOutput: queueItem.error || '',
      relatedFiles,
      language: this.runner.getLanguage(),
      framework: this.runner.getFramework(),
      systemPrompt: this.config.systemPrompt,
    };

    return prompt;
  }

  private async findRelatedFiles(testFile: string): Promise<{ path: string; content: string }[]> {
    const files: { path: string; content: string }[] = [];
    const testDir = path.dirname(testFile);
    const testName = path.basename(testFile, path.extname(testFile));
    
    const possibleSourceFiles = [
      testName.replace('.test', '').replace('.spec', ''),
      testName.replace('_test', '').replace('_spec', ''),
    ];
    
    const extensions = this.getSourceExtensions();
    
    for (const baseName of possibleSourceFiles) {
      for (const ext of extensions) {
        const sourcePath = path.join(testDir, `${baseName}${ext}`);
        const altSourcePath = path.join(testDir, '..', `${baseName}${ext}`);
        
        for (const candidate of [sourcePath, altSourcePath]) {
          if (fs.existsSync(candidate)) {
            files.push({
              path: candidate,
              content: fs.readFileSync(candidate, 'utf-8'),
            });
          }
        }
      }
    }

    return files;
  }

  private getSourceExtensions(): string[] {
    const language = this.runner.getLanguage();
    switch (language) {
      case 'javascript':
        return ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
      case 'python':
        return ['.py'];
      case 'ruby':
        return ['.rb'];
      default:
        return ['.js', '.py', '.rb'];
    }
  }

  private async applyChanges(changes: CodeChange[]): Promise<void> {
    for (const change of changes) {
      fs.writeFileSync(change.file, change.newContent, 'utf-8');
      this.log(`Applied changes to ${change.file}`, 'debug');
    }
  }

  private async revertChanges(changes: CodeChange[]): Promise<void> {
    for (const change of changes) {
      fs.writeFileSync(change.file, change.originalContent, 'utf-8');
      this.log(`Reverted changes to ${change.file}`, 'debug');
    }
  }

  private hasReachedMaxRetries(testFile: string): boolean {
    const attempts = this.fixHistory.get(testFile)?.length ?? 0;
    return attempts >= this.config.maxRetries;
  }

  private getDefaultSystemPrompt(): string {
    return `You are a test fixing assistant. Your task is to analyze failing tests and fix the code to make them pass.
    
Rules:
1. Only modify the minimum necessary code to fix the test
2. Preserve the existing code style and conventions
3. Do not change test expectations unless they are clearly wrong
4. Focus on fixing the implementation, not the test
5. Ensure your fix is clean, readable, and maintainable
6. Add necessary imports if missing
7. Fix any syntax errors or type errors

Return your fixes as code changes with clear explanations.`;
  }

  private log(message: string, level: 'info' | 'success' | 'warning' | 'error' | 'debug' = 'info'): void {
    if (level === 'debug' && !this.config.verbose) {
      return;
    }

    const prefix = {
      info: chalk.blue('ℹ'),
      success: chalk.green('✓'),
      warning: chalk.yellow('⚠'),
      error: chalk.red('✗'),
      debug: chalk.gray('⚙'),
    };

    console.log(`${prefix[level]} ${message}`);
  }

  public getFixHistory(): Map<string, FixAttempt[]> {
    return this.fixHistory;
  }

  public getSummary(): string {
    const attempts = Array.from(this.fixHistory.values()).flat();
    const successful = attempts.filter(a => a.success).length;
    const failed = attempts.filter(a => !a.success).length;
    const totalTime = attempts.reduce((sum, a) => sum + a.timeElapsed, 0);

    return `
Fix Session Summary:
${chalk.green('✓')} Fixed: ${successful}
${chalk.red('✗')} Failed: ${failed}
${chalk.blue('⏱')} Total time: ${(totalTime / 1000).toFixed(2)}s
${chalk.yellow('↻')} Total attempts: ${attempts.length}
    `.trim();
  }
}