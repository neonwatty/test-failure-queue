export { TestFailureQueue } from './core/queue.js';
export { TestDatabase } from './core/database.js';
export { 
  QueueItem, 
  QueueStatistics, 
  DatabaseConfig, 
  QueueOptions,
  ConfigFile
} from './core/types.js';
export { ConfigManager, loadConfig } from './core/config.js';
// Claude provider exports would go here when implemented
// export { TestFixer } from './providers/claude/test-fixer.js';
// export { ClaudeCodeClient } from './providers/claude/claude-code-client.js';
// export type { TestFixerConfig } from './providers/claude/types.js';