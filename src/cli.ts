#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { TestFailureQueue } from './core/queue.js';
import { QueueItem, ConfigFile, TestFramework, TestLanguage } from './core/types.js';
import { ConfigManager, loadConfig } from './core/config.js';
import { TestRunner } from './core/test-runner.js';
import { adapterRegistry } from './adapters/registry.js';
// Claude provider removed - no longer supported
import fs from 'fs';
import path from 'path';
import os from 'os';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get package.json to read version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();
let config: ConfigFile = {};
let queue: TestFailureQueue;

function useJsonOutput(options: any): boolean {
  return options.json !== undefined ? options.json : (config.jsonOutput || false);
}

function formatItem(item: QueueItem, index?: number): string {
  const num = index !== undefined ? `${index + 1}. ` : '';
  const priority = item.priority > 0 ? chalk.yellow(` [P${item.priority}]`) : '';
  const failures = item.failureCount > 1 ? chalk.red(` (${item.failureCount} failures)`) : '';
  return `${num}${chalk.cyan(item.filePath)}${priority}${failures}`;
}

function formatItemJson(item: QueueItem): object {
  return {
    filePath: item.filePath,
    priority: item.priority,
    failureCount: item.failureCount,
    createdAt: item.createdAt.toISOString(),
    lastFailure: item.lastFailure.toISOString()
  };
}

program
  .name('tfq')
  .description('Test Failure Queue - Manage failed test files')
  .version(packageJson.version)
  .option('--config <path>', 'Path to custom config file')
  .hook('preAction', (thisCommand, actionCommand) => {
    const opts = thisCommand.opts();
    config = loadConfig(opts.config);
    queue = new TestFailureQueue({
      databasePath: config.databasePath,
      autoCleanup: config.autoCleanup,
      maxRetries: config.maxRetries,
      configPath: opts.config
    });
  });

program
  .command('add <filepath>')
  .description('Add a failed test file to the queue')
  .option('-p, --priority <number>', 'Set priority (higher = processed first)')
  .option('--json', 'Output in JSON format')
  .action((filepath: string, options) => {
    try {
      const resolvedPath = path.resolve(filepath);
      const priority = options.priority !== undefined 
        ? parseInt(options.priority, 10) 
        : (config.defaultPriority || 0);
      
      if (isNaN(priority)) {
        console.error(chalk.red('Priority must be a number'));
        process.exit(1);
      }

      queue.enqueue(resolvedPath, priority);
      
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ 
          success: true, 
          message: 'File added to queue',
          filePath: resolvedPath,
          priority 
        }));
      } else {
        console.log(chalk.green('✓'), `Added ${chalk.cyan(resolvedPath)} to queue`);
        if (priority > 0) {
          console.log(chalk.yellow(`  Priority: ${priority}`));
        }
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('next') 
  .description('Get and remove the next item(s) from the queue')
  .option('--group', 'Get next group of files')
  .option('--json', 'Output in JSON format', config.jsonOutput || false)
  .action((options) => {
    try {
      if (options.group) {
        // Get group info before dequeuing for metadata
        const groupInfo = queue.peekGroup();
        const type = groupInfo && groupInfo[0]?.groupType || 'unknown';
        
        // Now dequeue the group
        const group = queue.dequeueGroup();
        
        if (group && group.length > 0) {
          if (useJsonOutput(options)) {
            console.log(JSON.stringify({ 
              success: true, 
              type,
              tests: group 
            }));
          } else {
            console.log(group.join('\n'));
          }
        } else {
          if (useJsonOutput(options)) {
            console.log(JSON.stringify({ success: false, message: 'No groups available' }));
          } else {
            console.log(chalk.yellow('No groups available'));
          }
          process.exit(1);
        }
      } else {
        // Regular single file dequeue
        const filePath = queue.dequeue();
        
        if (filePath) {
          if (useJsonOutput(options)) {
            console.log(JSON.stringify({ success: true, filePath }));
          } else {
            console.log(filePath);
          }
        } else {
          if (useJsonOutput(options)) {
            console.log(JSON.stringify({ success: false, message: 'Queue is empty' }));
          } else {
            console.log(chalk.yellow('Queue is empty'));
          }
          process.exit(1);
        }
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('peek')
  .description('View the next file without removing it')
  .option('--group', 'Peek at next group')
  .option('--json', 'Output in JSON format', config.jsonOutput || false)
  .action((options) => {
    try {
      if (options.group) {
        // Peek at next group
        const group = queue.peekGroup();
        
        if (group && group.length > 0) {
          if (useJsonOutput(options)) {
            const type = group[0]?.groupType || 'unknown';
            console.log(JSON.stringify({ 
              success: true, 
              type,
              tests: group.map(g => g.filePath) 
            }));
          } else {
            const type = group[0]?.groupType || 'unknown';
            console.log(chalk.bold(`Next group (${type}):`));
            group.forEach(item => console.log(`  - ${item.filePath}`));
          }
        } else {
          if (useJsonOutput(options)) {
            console.log(JSON.stringify({ success: false, message: 'No groups available' }));
          } else {
            console.log(chalk.yellow('No groups available'));
          }
          process.exit(1);
        }
      } else {
        // Regular single file peek
        const filePath = queue.peek();
        
        if (filePath) {
          if (useJsonOutput(options)) {
            console.log(JSON.stringify({ success: true, filePath }));
          } else {
            console.log(filePath);
          }
        } else {
          if (useJsonOutput(options)) {
            console.log(JSON.stringify({ success: false, message: 'Queue is empty' }));
          } else {
            console.log(chalk.yellow('Queue is empty'));
          }
          process.exit(1);
        }
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all files in the queue')
  .option('--json', 'Output in JSON format', config.jsonOutput || false)
  .action((options) => {
    try {
      const items = queue.list();
      
      if (items.length === 0) {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ success: true, items: [] }));
        } else {
          console.log(chalk.yellow('Queue is empty'));
        }
      } else {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ 
            success: true, 
            count: items.length,
            items: items.map(formatItemJson) 
          }));
        } else {
          console.log(chalk.bold(`\nQueue contains ${items.length} file(s):\n`));
          items.forEach((item, index) => {
            console.log(formatItem(item, index));
          });
          console.log();
        }
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('remove <filepath>')
  .description('Remove a specific file from the queue')
  .option('--json', 'Output in JSON format', config.jsonOutput || false)
  .action((filepath: string, options) => {
    try {
      const resolvedPath = path.resolve(filepath);
      const removed = queue.remove(resolvedPath);
      
      if (removed) {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ success: true, message: 'File removed', filePath: resolvedPath }));
        } else {
          console.log(chalk.green('✓'), `Removed ${chalk.cyan(resolvedPath)} from queue`);
        }
      } else {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ success: false, message: 'File not found in queue', filePath: resolvedPath }));
        } else {
          console.log(chalk.yellow('File not found in queue'));
        }
        process.exit(1);
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('clear')
  .description('Clear the entire queue')
  .option('--confirm', 'Skip confirmation prompt')
  .option('--json', 'Output in JSON format', config.jsonOutput || false)
  .action(async (options) => {
    try {
      const size = queue.size();
      
      if (size === 0) {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ success: true, message: 'Queue is already empty' }));
        } else {
          console.log(chalk.yellow('Queue is already empty'));
        }
        return;
      }

      if (!options.confirm && !options.json) {
        console.log(chalk.yellow(`This will remove ${size} file(s) from the queue.`));
        console.log('Use --confirm to skip this prompt.');
        process.exit(0);
      }

      queue.clear();
      
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: true, message: 'Queue cleared', itemsRemoved: size }));
      } else {
        console.log(chalk.green('✓'), `Queue cleared (${size} items removed)`);
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Display queue statistics')
  .option('--json', 'Output in JSON format', config.jsonOutput || false)
  .action((options) => {
    try {
      const stats = queue.getStats();
      
      if (useJsonOutput(options)) {
        const jsonStats = {
          ...stats,
          itemsByPriority: Object.fromEntries(stats.itemsByPriority),
          oldestItem: stats.oldestItem ? formatItemJson(stats.oldestItem) : null,
          newestItem: stats.newestItem ? formatItemJson(stats.newestItem) : null
        };
        console.log(JSON.stringify({ success: true, stats: jsonStats }));
      } else {
        console.log(chalk.bold('\nQueue Statistics:\n'));
        console.log(`Total items: ${chalk.cyan(stats.totalItems)}`);
        console.log(`Average failure count: ${chalk.yellow(stats.averageFailureCount.toFixed(2))}`);
        
        if (stats.oldestItem) {
          console.log(`\nOldest item:`);
          console.log(`  ${formatItem(stats.oldestItem)}`);
          console.log(`  Added: ${chalk.gray(stats.oldestItem.createdAt.toLocaleString())}`);
        }
        
        if (stats.newestItem) {
          console.log(`\nNewest item:`);
          console.log(`  ${formatItem(stats.newestItem)}`);
          console.log(`  Added: ${chalk.gray(stats.newestItem.createdAt.toLocaleString())}`);
        }
        
        if (stats.itemsByPriority.size > 0) {
          console.log(`\nItems by priority:`);
          Array.from(stats.itemsByPriority.entries())
            .sort((a, b) => b[0] - a[0])
            .forEach(([priority, count]) => {
              console.log(`  Priority ${priority}: ${count} item(s)`);
            });
        }
        console.log();
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('search <pattern>')
  .description('Search for files matching a pattern')
  .option('--json', 'Output in JSON format', config.jsonOutput || false)
  .action((pattern: string, options) => {
    try {
      const items = queue.search(pattern);
      
      if (items.length === 0) {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ success: true, items: [] }));
        } else {
          console.log(chalk.yellow('No matching files found'));
        }
      } else {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ 
            success: true, 
            count: items.length,
            pattern,
            items: items.map(formatItemJson) 
          }));
        } else {
          console.log(chalk.bold(`\nFound ${items.length} matching file(s):\n`));
          items.forEach((item, index) => {
            console.log(formatItem(item, index));
          });
          console.log();
        }
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('run-tests [command]')
  .description('Run tests and detect failures')
  .option('-l, --language <type>', 'Programming language: javascript|ruby|python')
  .option('-f, --framework <type>', 'Test framework (e.g., jest, mocha, vitest, rspec, pytest)')
  .option('--auto-detect', 'Auto-detect language and framework')
  .option('--list-frameworks', 'List available frameworks for the language')
  .option('--auto-add', 'Automatically add failing tests to queue')
  .option('-p, --priority <number>', 'Priority for auto-added tests', '0')
  .option('--skip-unsupported-check', 'Skip checking for unsupported frameworks (not recommended)')
  .option('--json', 'Output in JSON format')
  .action((command: string | undefined, options) => {
    try {
      let language: TestLanguage | null = options.language || null;
      let framework: string | null = options.framework || null;
      
      // Handle --list-frameworks
      if (options.listFrameworks) {
        if (!language && !options.autoDetect) {
          if (useJsonOutput(options)) {
            console.log(JSON.stringify({ 
              success: false, 
              error: 'Please specify a language with --language or use --auto-detect' 
            }));
          } else {
            console.error(chalk.red('Error:'), 'Please specify a language with --language or use --auto-detect');
          }
          process.exit(1);
        }
        
        if (options.autoDetect && !language) {
          language = adapterRegistry.detectLanguage();
          if (!language) {
            if (useJsonOutput(options)) {
              console.log(JSON.stringify({ 
                success: false, 
                error: 'Could not detect language from project' 
              }));
            } else {
              console.error(chalk.red('Error:'), 'Could not detect language from project');
            }
            process.exit(1);
          }
        }
        
        const frameworks = adapterRegistry.getFrameworksForLanguage(language!);
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ 
            success: true, 
            language, 
            frameworks 
          }));
        } else {
          console.log(chalk.bold(`\nAvailable frameworks for ${language}:`));
          frameworks.forEach(fw => console.log(`  - ${fw}`));
          console.log();
        }
        return;
      }
      
      // Auto-detect language and framework if requested
      if (options.autoDetect) {
        if (!language) {
          language = adapterRegistry.detectLanguage();
          if (!language) {
            // Default to JavaScript for backward compatibility
            language = 'javascript';
          }
        }
        
        if (!framework) {
          framework = adapterRegistry.detectFramework(language);
        }
      } else if (!language) {
        // Default to JavaScript for backward compatibility
        language = 'javascript';
      }
      
      // Validate language
      if (!adapterRegistry.hasAdapter(language)) {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ 
            success: false, 
            error: `Unsupported language: ${language}` 
          }));
        } else {
          console.error(chalk.red('Error:'), `Unsupported language: ${language}`);
        }
        process.exit(1);
      }
      
      // Get default framework if not specified
      if (!framework) {
        const adapter = adapterRegistry.get(language);
        framework = adapter.defaultFramework;
      }
      
      // Validate framework for the language
      const supportedFrameworks = adapterRegistry.getFrameworksForLanguage(language);
      if (!supportedFrameworks.includes(framework)) {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ 
            success: false, 
            error: `Invalid framework '${framework}' for ${language}. Must be one of: ${supportedFrameworks.join(', ')}` 
          }));
        } else {
          console.error(chalk.red('Error:'), `Invalid framework '${framework}' for ${language}`);
          console.error(`Must be one of: ${supportedFrameworks.join(', ')}`);
        }
        process.exit(1);
      }
      
      const testCommand = command || undefined;

      const runner = new TestRunner({
        command: testCommand,
        language: language as TestLanguage,
        framework: framework as TestFramework,
        skipUnsupportedCheck: options.skipUnsupportedCheck
      });

      if (!useJsonOutput(options)) {
        console.log(chalk.blue('Running tests...'));
        console.log(chalk.gray(`Language: ${language}`));
        console.log(chalk.gray(`Framework: ${framework}`));
        if (testCommand) {
          console.log(chalk.gray(`Command: ${testCommand}`));
        }
        console.log();
      }

      const result = runner.run();

      // Handle auto-add before output (works for both JSON and non-JSON)
      if (options.autoAdd && result.failingTests.length > 0) {
        const priority = parseInt(options.priority, 10);
        
        result.failingTests.forEach(test => {
          const absolutePath = path.resolve(test);
          // Pass stderr as error context for Claude
          queue.enqueue(absolutePath, priority, result.stderr || result.stdout);
        });
      }

      if (useJsonOutput(options)) {
        console.log(JSON.stringify({
          success: result.success,
          exitCode: result.exitCode,
          failingTests: result.failingTests,
          totalFailures: result.totalFailures,
          duration: result.duration,
          language: result.language,
          framework: result.framework,
          command: result.command,
          error: result.error,
          // Include auto-add info in JSON output
          ...(options.autoAdd && result.failingTests.length > 0 && {
            autoAdded: true,
            testsAdded: result.failingTests.length,
            priority: parseInt(options.priority, 10)
          })
        }));
      } else {
        if (result.success) {
          console.log(chalk.green('✓'), 'All tests passed!');
        } else {
          console.log(chalk.red('✗'), `Tests failed with exit code ${result.exitCode}`);
          
          if (result.failingTests.length > 0) {
            console.log(chalk.yellow(`\nFound ${result.totalFailures} failing test file(s):`));
            result.failingTests.forEach(test => {
              console.log(`  ${chalk.red('•')} ${chalk.cyan(test)}`);
            });

            if (options.autoAdd) {
              const priority = parseInt(options.priority, 10);
              console.log(chalk.blue('\nAdding failures to queue...'));
              console.log(chalk.green('✓'), `Added ${result.failingTests.length} test(s) to queue`);
              if (priority > 0) {
                console.log(chalk.yellow(`  Priority: ${priority}`));
              }
            }
          } else {
            console.log(chalk.yellow('\nNo failing test files detected in output'));
            console.log(chalk.gray('(Tests may have failed but no file paths were found)'));
          }
        }
        
        console.log(chalk.gray(`\nTest run completed in ${result.duration}ms`));
      }

      process.exit(result.exitCode);
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('check-compatibility')
  .description('Check for unsupported test frameworks in the project')
  .option('--json', 'Output in JSON format')
  .action((options) => {
    try {
      const unsupported = TestRunner.detectUnsupportedFrameworks();
      
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ 
          success: unsupported.length === 0,
          compatible: unsupported.length === 0,
          unsupportedFrameworks: unsupported 
        }));
      } else {
        if (unsupported.length === 0) {
          console.log(chalk.green('✓'), 'No unsupported frameworks detected. Your project is compatible with tfq!');
        } else {
          console.log(chalk.yellow('⚠️'), 'Unsupported test frameworks detected:\n');
          unsupported.forEach(({ framework, language, suggestion }) => {
            console.log(`  ${chalk.red('✗')} ${chalk.cyan(framework)} (${language})`);
            console.log(`     ${chalk.gray(suggestion)}\n`);
          });
          console.log(chalk.gray('To continue using these frameworks with tfq, you can:'));
          console.log(chalk.gray('1. Migrate to a supported framework (recommended)'));
          console.log(chalk.gray('2. Use --skip-unsupported-check flag with run-tests (not recommended)'));
          process.exit(1);
        }
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('set-groups')
  .description('Set execution groups for queued tests')
  .option('--json <data>', 'JSON data containing groups')
  .option('--file <path>', 'Path to JSON file containing groups')
  .option('--json-output', 'Output result in JSON format')
  .action((options) => {
    try {
      let groupData: any;
      
      if (options.file) {
        const fileContent = fs.readFileSync(options.file, 'utf-8');
        groupData = JSON.parse(fileContent);
      } else if (options.json) {
        groupData = JSON.parse(options.json);
      } else {
        throw new Error('Either --json or --file option is required');
      }

      // Support both simple array format and advanced format
      if (Array.isArray(groupData)) {
        // Simple format: [["test1", "test2"], ["test3"]]
        // Resolve paths to absolute to match how files are added
        const resolvedGroups = groupData.map((group: string[]) => 
          group.map((file: string) => path.resolve(file))
        );
        queue.setExecutionGroups(resolvedGroups);
      } else if (groupData.groups && Array.isArray(groupData.groups)) {
        // Advanced format with ExecutionGroup objects
        if (groupData.groups.every((g: any) => Array.isArray(g))) {
          // Array of arrays within groups property
          const resolvedGroups = groupData.groups.map((group: string[]) => 
            group.map((file: string) => path.resolve(file))
          );
          queue.setExecutionGroups(resolvedGroups);
        } else {
          // Full GroupingPlan format - resolve paths in tests arrays
          const resolvedPlan = {
            ...groupData,
            groups: groupData.groups.map((group: any) => ({
              ...group,
              tests: group.tests.map((file: string) => path.resolve(file))
            }))
          };
          queue.setExecutionGroupsAdvanced(resolvedPlan);
        }
      } else {
        throw new Error('Invalid group data format');
      }

      const stats = queue.getGroupStats();
      
      if (options.jsonOutput) {
        console.log(JSON.stringify({ 
          success: true, 
          message: 'Groups set successfully',
          stats 
        }));
      } else {
        console.log(chalk.green('✓'), 'Groups set successfully');
        console.log(chalk.gray(`Total groups: ${stats.totalGroups}`));
        console.log(chalk.gray(`Parallel groups: ${stats.parallelGroups}`));
        console.log(chalk.gray(`Sequential groups: ${stats.sequentialGroups}`));
      }
    } catch (error: any) {
      if (options.jsonOutput) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('get-groups')
  .description('View current execution groups')
  .option('--json', 'Output in JSON format')
  .action((options) => {
    try {
      const plan = queue.getGroupingPlan();
      
      if (!plan) {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ 
            success: true, 
            message: 'No groups configured',
            groups: [] 
          }));
        } else {
          console.log(chalk.yellow('No groups configured'));
        }
        return;
      }

      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ 
          success: true,
          ...plan
        }));
      } else {
        console.log(chalk.bold('\nExecution Groups:\n'));
        plan.groups.forEach((group, index) => {
          const typeIcon = group.type === 'parallel' ? '⚡' : '→';
          console.log(`${chalk.cyan(`Group ${group.groupId}`)} ${typeIcon} ${chalk.gray(group.type)}`);
          group.tests.forEach(test => {
            console.log(`  - ${test}`);
          });
        });
        console.log();
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('clear-groups')
  .description('Clear all grouping data')
  .option('--confirm', 'Skip confirmation prompt')
  .option('--json', 'Output in JSON format')
  .action((options) => {
    try {
      if (!queue.hasGroups()) {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ 
            success: true, 
            message: 'No groups to clear' 
          }));
        } else {
          console.log(chalk.yellow('No groups to clear'));
        }
        return;
      }

      const stats = queue.getGroupStats();
      
      if (!options.confirm && !options.json) {
        console.log(chalk.yellow(`This will clear grouping data for ${stats.totalGroups} group(s).`));
        console.log('Use --confirm to skip this prompt.');
        process.exit(0);
      }

      queue.clearGroups();
      
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ 
          success: true, 
          message: 'Groups cleared',
          clearedGroups: stats.totalGroups 
        }));
      } else {
        console.log(chalk.green('✓'), `Cleared ${stats.totalGroups} group(s)`);
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('group-stats')
  .description('Show grouping statistics')
  .option('--json', 'Output in JSON format')
  .action((options) => {
    try {
      const stats = queue.getGroupStats();
      
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ 
          success: true,
          ...stats
        }));
      } else {
        console.log(chalk.bold('\nGrouping Statistics:\n'));
        console.log(`Total groups: ${chalk.cyan(stats.totalGroups)}`);
        console.log(`Parallel groups: ${chalk.yellow(stats.parallelGroups)}`);
        console.log(`Sequential groups: ${chalk.blue(stats.sequentialGroups)}`);
        console.log();
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program
  .command('languages')
  .description('List all supported languages and their test frameworks')
  .option('--json', 'Output in JSON format')
  .action((options) => {
    try {
      const adapters = adapterRegistry.list();
      
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ 
          success: true, 
          languages: adapters 
        }));
      } else {
        console.log(chalk.bold('\nSupported Languages and Frameworks:\n'));
        
        for (const adapter of adapters) {
          console.log(chalk.cyan(`${adapter.language}:`));
          console.log(`  Default framework: ${chalk.yellow(adapter.defaultFramework)}`);
          console.log(`  Supported frameworks:`);
          adapter.supportedFrameworks.forEach(fw => {
            const isDefault = fw === adapter.defaultFramework;
            const marker = isDefault ? chalk.green(' (default)') : '';
            console.log(`    - ${fw}${marker}`);
          });
          console.log();
        }
        
        console.log(chalk.gray('Use --auto-detect to automatically detect the language and framework'));
        console.log(chalk.gray('Use --list-frameworks with a specific language to see its frameworks'));
      }
    } catch (error: any) {
      if (useJsonOutput(options)) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

// fix-tests command removed - Claude provider no longer supported

program
  .command('config')
  .description('Manage configuration')
  .option('--init', 'Create default config file')
  .option('--path', 'Show config file path')
  .option('--show', 'Show current configuration')
  .action((options) => {
    try {
      const manager = ConfigManager.getInstance(program.opts().config);
      
      if (options.init) {
        const configPath = path.join(process.cwd(), '.tfqrc');
        if (fs.existsSync(configPath)) {
          console.log(chalk.yellow('Config file already exists at'), chalk.cyan(configPath));
          process.exit(1);
        }
        manager.createDefaultConfig();
        console.log(chalk.green('✓'), 'Created default config file at', chalk.cyan(configPath));
        return;
      }
      
      if (options.path) {
        const configPath = manager.getConfigPath();
        if (configPath) {
          console.log('Config file:', chalk.cyan(configPath));
        } else {
          console.log('No config file found. Using defaults.');
          console.log('\nConfig file search paths (in order):');
          console.log('  1.', chalk.cyan(path.join(process.cwd(), '.tfqrc')));
          console.log('  2.', chalk.cyan(path.join(os.homedir(), '.tfqrc')));
          console.log('  3.', chalk.cyan(path.join(os.homedir(), '.tfq', 'config.json')));
        }
        return;
      }
      
      const currentConfig = manager.getConfig();
      console.log(chalk.bold('Current Configuration:'));
      console.log(JSON.stringify(currentConfig, null, 2));
      
      if (!manager.getConfigPath()) {
        console.log(chalk.gray('\n(Using default values - no config file found)'));
        console.log(chalk.gray('Run "tfq config --init" to create a config file'));
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);