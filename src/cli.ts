#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { TestFailureQueue } from './queue';
import { QueueItem } from './types';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();
const queue = new TestFailureQueue();

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
  .version('1.0.0');

program
  .command('add <filepath>')
  .description('Add a failed test file to the queue')
  .option('-p, --priority <number>', 'Set priority (higher = processed first)', '0')
  .option('--json', 'Output in JSON format')
  .action((filepath: string, options) => {
    try {
      const resolvedPath = path.resolve(filepath);
      const priority = parseInt(options.priority, 10);
      
      if (isNaN(priority)) {
        console.error(chalk.red('Priority must be a number'));
        process.exit(1);
      }

      queue.enqueue(resolvedPath, priority);
      
      if (options.json) {
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
      if (options.json) {
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
  .option('--json', 'Output in JSON format')
  .action((options) => {
    try {
      const filePath = queue.dequeue();
      
      if (filePath) {
        if (options.json) {
          console.log(JSON.stringify({ success: true, filePath }));
        } else {
          console.log(filePath);
        }
      } else {
        if (options.json) {
          console.log(JSON.stringify({ success: false, message: 'Queue is empty' }));
        } else {
          console.log(chalk.yellow('Queue is empty'));
        }
        process.exit(1);
      }
    } catch (error: any) {
      if (options.json) {
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
  .option('--json', 'Output in JSON format')
  .action((options) => {
    try {
      const filePath = queue.peek();
      
      if (filePath) {
        if (options.json) {
          console.log(JSON.stringify({ success: true, filePath }));
        } else {
          console.log(filePath);
        }
      } else {
        if (options.json) {
          console.log(JSON.stringify({ success: false, message: 'Queue is empty' }));
        } else {
          console.log(chalk.yellow('Queue is empty'));
        }
        process.exit(1);
      }
    } catch (error: any) {
      if (options.json) {
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
  .option('--json', 'Output in JSON format')
  .action((options) => {
    try {
      const items = queue.list();
      
      if (items.length === 0) {
        if (options.json) {
          console.log(JSON.stringify({ success: true, items: [] }));
        } else {
          console.log(chalk.yellow('Queue is empty'));
        }
      } else {
        if (options.json) {
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
      if (options.json) {
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
  .option('--json', 'Output in JSON format')
  .action((filepath: string, options) => {
    try {
      const resolvedPath = path.resolve(filepath);
      const removed = queue.remove(resolvedPath);
      
      if (removed) {
        if (options.json) {
          console.log(JSON.stringify({ success: true, message: 'File removed', filePath: resolvedPath }));
        } else {
          console.log(chalk.green('✓'), `Removed ${chalk.cyan(resolvedPath)} from queue`);
        }
      } else {
        if (options.json) {
          console.log(JSON.stringify({ success: false, message: 'File not found in queue', filePath: resolvedPath }));
        } else {
          console.log(chalk.yellow('File not found in queue'));
        }
        process.exit(1);
      }
    } catch (error: any) {
      if (options.json) {
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
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const size = queue.size();
      
      if (size === 0) {
        if (options.json) {
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
      
      if (options.json) {
        console.log(JSON.stringify({ success: true, message: 'Queue cleared', itemsRemoved: size }));
      } else {
        console.log(chalk.green('✓'), `Queue cleared (${size} items removed)`);
      }
    } catch (error: any) {
      if (options.json) {
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
  .option('--json', 'Output in JSON format')
  .action((options) => {
    try {
      const stats = queue.getStats();
      
      if (options.json) {
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
      if (options.json) {
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
  .option('--json', 'Output in JSON format')
  .action((pattern: string, options) => {
    try {
      const items = queue.search(pattern);
      
      if (items.length === 0) {
        if (options.json) {
          console.log(JSON.stringify({ success: true, items: [] }));
        } else {
          console.log(chalk.yellow('No matching files found'));
        }
      } else {
        if (options.json) {
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
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: error.message }));
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);