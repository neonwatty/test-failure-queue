# TFQ API Documentation

## Overview

The Test Failure Queue (TFQ) library provides a comprehensive API for managing test failures across multiple programming languages and test frameworks. This document covers the adapter API for extending TFQ with custom language support.

## Core API

### TestFailureQueue

The main class for managing the test failure queue.

```typescript
class TestFailureQueue {
  constructor(options?: TestQueueOptions)
  
  // Queue operations
  enqueue(filePath: string, priority?: number, error?: string): void
  dequeue(): string | null
  peek(): string | null
  remove(filePath: string): boolean
  clear(): void
  
  // Query operations
  list(): QueueItem[]
  size(): number
  contains(filePath: string): boolean
  search(pattern: string): QueueItem[]
  searchGlob(pattern: string): QueueItem[]
  
  // Grouping operations
  setExecutionGroups(groups: string[][]): void
  setExecutionGroupsAdvanced(plan: GroupingPlan): void
  dequeueGroup(): string[] | null
  peekGroup(): QueueItem[] | null
  getGroupingPlan(): GroupingPlan | null
  hasGroups(): boolean
  clearGroups(): void
  getGroupStats(): { totalGroups: number; parallelGroups: number; sequentialGroups: number }
  
  // Statistics
  getStats(): QueueStatistics
  
  // Lifecycle
  close(): void
}
```

### TestRunner

The test runner with multi-language support.

```typescript
class TestRunner {
  constructor(options?: TestRunnerOptions)
  
  // Run tests
  run(): TestRunResult
  
  // Static methods
  static runTests(command?: string, options?: TestRunnerOptions): TestRunResult
  static parseTestOutput(output: string, options?: TestRunnerOptions): string[]
  static getDefaultCommand(language?: string, framework?: string): string
}
```

## Adapter API

### Creating Custom Language Adapters

To add support for a new language, extend the `BaseAdapter` class:

```typescript
import { BaseAdapter, TestPattern, TestRunResult } from 'tfq';

export class CustomLanguageAdapter extends BaseAdapter {
  language = 'custom';
  supportedFrameworks = ['framework1', 'framework2'];
  
  getTestCommand(framework: string, command?: string): string {
    if (command) return command;
    
    switch(framework) {
      case 'framework1':
        return 'custom-test-runner';
      case 'framework2':
        return 'another-test-runner';
      default:
        return 'default-test-command';
    }
  }
  
  getFailurePatterns(framework: string): TestPattern[] {
    return [
      {
        pattern: /FAILED: (.+\.test\.\w+)/g,
        fileIndex: 1,
        lineIndex: null
      },
      {
        pattern: /Error in (.+):(\d+)/g,
        fileIndex: 1,
        lineIndex: 2
      }
    ];
  }
  
  parseTestOutput(output: string, framework: string): string[] {
    const patterns = this.getFailurePatterns(framework);
    const failures = new Set<string>();
    
    for (const { pattern, fileIndex } of patterns) {
      const matches = [...output.matchAll(pattern)];
      for (const match of matches) {
        if (match[fileIndex]) {
          failures.add(match[fileIndex]);
        }
      }
    }
    
    return Array.from(failures);
  }
  
  validateFramework(framework: string): boolean {
    return this.supportedFrameworks.includes(framework);
  }
  
  async detectFramework(projectPath: string): Promise<string | null> {
    // Implement framework detection logic
    // Check for configuration files, dependencies, etc.
    return null;
  }
}
```

### Registering Custom Adapters

Register your adapter with the global registry:

```typescript
import { TestAdapterRegistry } from 'tfq';
import { CustomLanguageAdapter } from './custom-adapter';

// Get the registry instance
const registry = TestAdapterRegistry.getInstance();

// Register your adapter
registry.register('custom', new CustomLanguageAdapter());

// Use it with TestRunner
const runner = new TestRunner({
  language: 'custom',
  framework: 'framework1'
});
```

### BaseAdapter Interface

All adapters must implement these methods:

```typescript
abstract class BaseAdapter {
  abstract language: string;
  abstract supportedFrameworks: string[];
  
  // Required methods
  abstract getTestCommand(framework: string, command?: string): string;
  abstract getFailurePatterns(framework: string): TestPattern[];
  abstract parseTestOutput(output: string, framework: string): string[];
  abstract validateFramework(framework: string): boolean;
  abstract detectFramework(projectPath: string): Promise<string | null>;
  
  // Optional methods (have default implementations)
  getDefaultFramework(): string;
  formatFailurePath(path: string, line?: string): string;
  normalizeTestPath(path: string, projectRoot: string): string;
}
```

### TestPattern Interface

Defines patterns for matching test failures:

```typescript
interface TestPattern {
  pattern: RegExp;          // Regular expression to match failures
  fileIndex: number;        // Capture group index for file path
  lineIndex: number | null; // Capture group index for line number (optional)
  transform?: (match: RegExpMatchArray) => string; // Optional transform function
}
```

## Type Definitions

### Core Types

```typescript
// Supported languages (extensible)
type TestLanguage = 'javascript' | 'ruby' | 'python' | string;

// Queue item structure
interface QueueItem {
  id: number;
  filePath: string;
  priority: number;
  failureCount: number;
  createdAt: Date;
  lastFailure: Date;
}

// Queue statistics
interface QueueStats {
  totalItems: number;
  averageFailureCount: number;
  oldestItem: QueueItem | null;
  itemsByPriority: Map<number, number>;
}

// Test runner options
interface TestRunnerOptions {
  language?: string;
  framework?: string;
  command?: string;
  autoDetect?: boolean;
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

// Test run result
interface TestRunResult {
  success: boolean;
  exitCode: number | null;
  failingTests: string[];
  totalFailures: number;
  duration: number;
  language: string;
  framework: string;
  command: string;
  output?: string;
  error?: string;
}
```

### Configuration Types

```typescript
interface ConfigFile {
  databasePath?: string;
  defaultPriority?: number;
  autoCleanup?: boolean;
  maxRetries?: number;
  verbose?: boolean;
  jsonOutput?: boolean;
  colorOutput?: boolean;
  defaultLanguage?: string;
  defaultFrameworks?: Record<string, string>;
  testCommands?: Record<string, string>;
}
```

## Examples

### Example: Adding Go Support

```typescript
import { BaseAdapter, TestPattern } from 'tfq';
import * as fs from 'fs';
import * as path from 'path';

export class GoAdapter extends BaseAdapter {
  language = 'go';
  supportedFrameworks = ['go', 'ginkgo', 'testify'];
  
  getTestCommand(framework: string, command?: string): string {
    if (command) return command;
    
    switch(framework) {
      case 'ginkgo':
        return 'ginkgo -r';
      case 'testify':
        return 'go test -v ./...';
      default:
        return 'go test ./...';
    }
  }
  
  getFailurePatterns(framework: string): TestPattern[] {
    const patterns: TestPattern[] = [];
    
    // Standard go test output
    patterns.push({
      pattern: /FAIL\s+(.+?)\s+\[/g,
      fileIndex: 1,
      lineIndex: null
    });
    
    // File:line pattern in stack traces
    patterns.push({
      pattern: /\s+(.+\.go):(\d+)/g,
      fileIndex: 1,
      lineIndex: 2
    });
    
    if (framework === 'ginkgo') {
      patterns.push({
        pattern: /\[FAIL\].+\s+(.+\.go):(\d+)/g,
        fileIndex: 1,
        lineIndex: 2
      });
    }
    
    return patterns;
  }
  
  parseTestOutput(output: string, framework: string): string[] {
    const patterns = this.getFailurePatterns(framework);
    const failures = new Set<string>();
    
    for (const { pattern, fileIndex, lineIndex } of patterns) {
      const matches = [...output.matchAll(pattern)];
      for (const match of matches) {
        let failurePath = match[fileIndex];
        if (lineIndex && match[lineIndex]) {
          failurePath = `${failurePath}:${match[lineIndex]}`;
        }
        failures.add(failurePath);
      }
    }
    
    return Array.from(failures);
  }
  
  validateFramework(framework: string): boolean {
    return this.supportedFrameworks.includes(framework);
  }
  
  async detectFramework(projectPath: string): Promise<string | null> {
    // Check for go.mod
    const goModPath = path.join(projectPath, 'go.mod');
    if (!fs.existsSync(goModPath)) {
      return null;
    }
    
    const goModContent = fs.readFileSync(goModPath, 'utf-8');
    
    // Check for Ginkgo
    if (goModContent.includes('github.com/onsi/ginkgo')) {
      return 'ginkgo';
    }
    
    // Check for testify
    if (goModContent.includes('github.com/stretchr/testify')) {
      return 'testify';
    }
    
    // Default to standard go test
    return 'go';
  }
}

// Register the adapter
import { TestAdapterRegistry } from 'tfq';

const registry = TestAdapterRegistry.getInstance();
registry.register('go', new GoAdapter());
```

### Example: Using Custom Adapters in CLI

After registering a custom adapter, it's automatically available in the CLI:

```bash
# List languages (will include your custom language)
tfq languages

# Run tests with custom language
tfq run-tests --language go --framework ginkgo

# Auto-detect will also check custom adapters
tfq run-tests --auto-detect
```

### Example: Programmatic Usage with Custom Adapter

```typescript
import { TestRunner, TestAdapterRegistry } from 'tfq';
import { GoAdapter } from './go-adapter';

// Register adapter
const registry = TestAdapterRegistry.getInstance();
registry.register('go', new GoAdapter());

// Use with TestRunner
const runner = new TestRunner({
  language: 'go',
  framework: 'ginkgo',
  cwd: '/path/to/go/project'
});

const result = runner.run();
console.log(`Found ${result.failingTests.length} failing tests`);

// Or use static method
const quickResult = TestRunner.runTests('go test ./...', {
  language: 'go',
  framework: 'go'
});
```

## Adapter Development Guide

### Best Practices

1. **Pattern Matching**: Use global regex flags (`/pattern/g`) to match all occurrences
2. **Path Normalization**: Always normalize paths relative to project root
3. **Framework Detection**: Check multiple indicators (dependencies, config files, directory structure)
4. **Error Handling**: Gracefully handle missing files or invalid configurations
5. **Performance**: Cache framework detection results when possible

### Testing Your Adapter

```typescript
import { GoAdapter } from './go-adapter';

describe('GoAdapter', () => {
  let adapter: GoAdapter;
  
  beforeEach(() => {
    adapter = new GoAdapter();
  });
  
  test('parses go test failures', () => {
    const output = `
      --- FAIL: TestExample (0.00s)
          example_test.go:10: Expected 5, got 3
      FAIL    github.com/user/project 0.123s
    `;
    
    const failures = adapter.parseTestOutput(output, 'go');
    expect(failures).toContain('example_test.go:10');
  });
  
  test('detects ginkgo framework', async () => {
    const framework = await adapter.detectFramework('/path/with/ginkgo');
    expect(framework).toBe('ginkgo');
  });
});
```

### Common Patterns by Language

#### Compiled Languages (Go, Java, C++)
- Focus on package/module names in addition to file paths
- Handle build errors separately from test failures
- Consider longer test execution times

#### Interpreted Languages (Python, Ruby, JavaScript)
- File paths are usually more direct
- Stack traces often include line numbers
- Framework detection via package managers

#### Framework-Specific Considerations
- **BDD Frameworks**: May report scenarios instead of files
- **Parallel Test Runners**: May have interleaved output
- **Custom Reporters**: May need special parsing logic

## Migration Guide for Adapter Authors

If you have existing test parsing code, here's how to migrate to TFQ's adapter system:

1. **Extend BaseAdapter**: Create a class extending `BaseAdapter`
2. **Define Language and Frameworks**: Set `language` and `supportedFrameworks` properties
3. **Implement Pattern Matching**: Convert your regex patterns to `TestPattern` objects
4. **Add Framework Detection**: Implement `detectFramework()` method
5. **Register with Registry**: Register your adapter globally or locally
6. **Test Integration**: Verify CLI and programmatic usage

## API Stability

The adapter API follows semantic versioning:

- **Stable**: `BaseAdapter` abstract methods, `TestPattern` interface
- **Experimental**: Auto-detection heuristics, pattern matching optimizations
- **Internal**: Registry implementation details, caching mechanisms

Breaking changes to the stable API will only occur in major version updates.

## Support and Contributing

For questions about the adapter API or to contribute new language adapters:

1. Check existing adapters in `src/adapters/` for examples
2. Open an issue for discussion before implementing
3. Include comprehensive tests with your adapter
4. Update this documentation with your language's details

## License

MIT