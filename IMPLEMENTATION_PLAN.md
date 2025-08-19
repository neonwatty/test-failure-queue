# Test Failure Queue Library - Implementation Plan & Todo List

## Project Overview
TypeScript library using SQLite to maintain a persistent queue of failed test file paths, with both programmatic API and CLI interface.

## Todo List

### Phase 1: Project Setup
- [ ] Initialize npm project with `npm init -y`
- [ ] Install production dependencies:
  - [ ] `better-sqlite3` - SQLite3 bindings
  - [ ] `commander` - CLI framework
  - [ ] `chalk` - Terminal styling
  - [ ] `glob` - File pattern matching
  - [ ] `os-homedir` - Cross-platform home directory
- [ ] Install dev dependencies:
  - [ ] `typescript`
  - [ ] `@types/node`
  - [ ] `@types/better-sqlite3`
  - [ ] `@types/glob`
  - [ ] `tsx` - TypeScript execution
  - [ ] `jest` and `@types/jest` - Testing
- [ ] Create `tsconfig.json` with proper configuration
- [ ] Create `.gitignore` file
- [ ] Set up project structure directories

### Phase 2: Database Module
- [ ] Create `src/types.ts` with TypeScript interfaces:
  - [ ] `QueueItem` interface
  - [ ] `QueueOptions` interface
  - [ ] `DatabaseConfig` interface
- [ ] Create `src/database.ts`:
  - [ ] Database initialization function
  - [ ] Create tables with proper schema
  - [ ] Add migration support
  - [ ] Implement connection pooling
  - [ ] Add database path configuration (~/.tfq/queue.db)

### Phase 3: Core Queue Implementation
- [ ] Create `src/queue.ts` with `TestFailureQueue` class:
  - [ ] Constructor with database initialization
  - [ ] `enqueue(filePath: string, priority?: number): void`
  - [ ] `dequeue(): string | null`
  - [ ] `peek(): string | null`
  - [ ] `list(): Array<QueueItem>`
  - [ ] `remove(filePath: string): boolean`
  - [ ] `clear(): void`
  - [ ] `size(): number`
  - [ ] `contains(filePath: string): boolean`
  - [ ] `search(pattern: string): Array<QueueItem>`
  - [ ] `getStats(): QueueStatistics`
- [ ] Add error handling and validation
- [ ] Implement duplicate prevention logic
- [ ] Add failure count tracking

### Phase 4: CLI Interface
- [ ] Create `src/cli.ts`:
  - [ ] Set up commander program
  - [ ] Implement `add` command with priority flag
  - [ ] Implement `next` command (dequeue)
  - [ ] Implement `peek` command
  - [ ] Implement `list` command with JSON output option
  - [ ] Implement `remove` command
  - [ ] Implement `clear` command with confirmation
  - [ ] Implement `stats` command
  - [ ] Implement `search` command with glob patterns
- [ ] Create `bin/tfq` executable script
- [ ] Add colored output with chalk
- [ ] Add JSON output mode for AI agents
- [ ] Add help text and examples

### Phase 5: Library Exports
- [ ] Create `src/index.ts`:
  - [ ] Export TestFailureQueue class
  - [ ] Export types and interfaces
  - [ ] Export utility functions

### Phase 6: Build Configuration
- [ ] Configure package.json scripts:
  - [ ] `build` - Compile TypeScript
  - [ ] `dev` - Development mode
  - [ ] `test` - Run tests
  - [ ] `lint` - Code linting
- [ ] Set up bin field for CLI
- [ ] Configure main and types fields

### Phase 7: Documentation
- [ ] Create comprehensive `USER_GUIDE.md`:
  - [ ] Installation instructions
  - [ ] CLI usage for humans (with examples)
  - [ ] CLI usage for AI agents (JSON mode)
  - [ ] Programmatic API documentation
  - [ ] TypeScript usage examples
  - [ ] Integration examples
  - [ ] Troubleshooting section
- [ ] Add inline JSDoc comments
- [ ] Create example scripts

### Phase 8: Testing
- [ ] Set up Jest configuration
- [ ] Write unit tests for queue operations
- [ ] Write integration tests for database
- [ ] Test CLI commands
- [ ] Add example test scenarios

### Phase 9: Polish & Optimization
- [ ] Add input validation
- [ ] Implement proper error messages
- [ ] Add debug mode
- [ ] Optimize database queries
- [ ] Add database cleanup/vacuum
- [ ] Add configuration file support

## Database Schema

```sql
CREATE TABLE failed_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT UNIQUE NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  failure_count INTEGER DEFAULT 1,
  last_failure DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_priority_created ON failed_tests(priority DESC, created_at ASC);
```

## API Structure

```typescript
interface QueueItem {
  id: number;
  filePath: string;
  priority: number;
  createdAt: Date;
  failureCount: number;
  lastFailure: Date;
}

interface QueueStatistics {
  totalItems: number;
  oldestItem: QueueItem | null;
  newestItem: QueueItem | null;
  averageFailureCount: number;
  itemsByPriority: Map<number, number>;
}
```

## CLI Commands Reference

```bash
# Add file to queue
tfq add <filepath> [--priority <n>]

# Get and remove next file
tfq next

# View next file without removing
tfq peek

# List all files
tfq list [--json]

# Remove specific file
tfq remove <filepath>

# Clear queue
tfq clear [--confirm]

# Get statistics
tfq stats

# Search files
tfq search <pattern>
```

## Notes
- Database stored in `~/.tfq/queue.db`
- FIFO queue with priority support
- Duplicate files update failure count instead of creating new entry
- JSON output mode for programmatic access
- Cross-platform support via os-homedir