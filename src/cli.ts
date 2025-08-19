#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { TestFailureQueue } from './queue';
import { QueueItem, ConfigFile, TestFramework } from './types';
import { ConfigManager, loadConfig } from './config';
import { TestRunner } from './test-runner';
import * as fs from 'fs';
import * as path from 'path';

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
  .version('1.0.0')
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
  .description('Get and remove the next file from the queue')
  .option('--json', 'Output in JSON format', config.jsonOutput || false)
  .action((options) => {
    try {
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
  .option('--json', 'Output in JSON format', config.jsonOutput || false)
  .action((options) => {
    try {
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
  .option('-f, --framework <type>', 'Test framework: jest|mocha|vitest', 'jest')
  .option('--auto-add', 'Automatically add failing tests to queue')
  .option('-p, --priority <number>', 'Priority for auto-added tests', '0')
  .option('--json', 'Output in JSON format')
  .action((command: string | undefined, options) => {
    try {
      const testCommand = command || 'npm test';
      const framework = options.framework.toLowerCase();
      
      if (!TestRunner.isValidFramework(framework)) {
        if (useJsonOutput(options)) {
          console.log(JSON.stringify({ 
            success: false, 
            error: `Invalid framework: ${framework}. Must be one of: ${TestRunner.getFrameworks().join(', ')}` 
          }));
        } else {
          console.error(chalk.red('Error:'), `Invalid framework: ${framework}`);
          console.error(`Must be one of: ${TestRunner.getFrameworks().join(', ')}`);
        }
        process.exit(1);
      }

      const runner = new TestRunner({
        command: testCommand,
        framework: framework as TestFramework
      });

      if (!useJsonOutput(options)) {
        console.log(chalk.blue('Running tests...'));
        console.log(chalk.gray(`Command: ${testCommand}`));
        console.log(chalk.gray(`Framework: ${framework}`));
        console.log();
      }

      const result = runner.run();

      if (useJsonOutput(options)) {
        console.log(JSON.stringify({
          success: result.success,
          exitCode: result.exitCode,
          failingTests: result.failingTests,
          totalFailures: result.totalFailures,
          duration: result.duration,
          framework: result.framework,
          command: result.command,
          error: result.error
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
              
              result.failingTests.forEach(test => {
                queue.enqueue(test, priority);
              });
              
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
          console.log('  2.', chalk.cyan(path.join(require('os').homedir(), '.tfqrc')));
          console.log('  3.', chalk.cyan(path.join(require('os').homedir(), '.tfq', 'config.json')));
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