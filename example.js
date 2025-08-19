#!/usr/bin/env node

// Example usage of tfq library
// Run with: node example.js

const { TestFailureQueue } = require('./dist/index.js');

async function main() {
  console.log('Test Failure Queue - Example Usage\n');
  console.log('===================================\n');

  // Initialize the queue
  const queue = new TestFailureQueue({
    databasePath: './example-queue.db' // Use local DB for demo
  });

  // Clear any existing data for a fresh demo
  queue.clear();
  console.log('✓ Queue initialized and cleared\n');

  // Add some test files
  console.log('Adding failed tests to queue...');
  queue.enqueue('tests/auth/login.test.js', 10); // High priority
  queue.enqueue('tests/auth/logout.test.js', 10);
  queue.enqueue('tests/api/users.test.js', 5);   // Medium priority
  queue.enqueue('tests/api/posts.test.js', 5);
  queue.enqueue('tests/utils/helpers.test.js');  // Default priority (0)
  queue.enqueue('tests/utils/validators.test.js');
  console.log('✓ Added 6 test files\n');

  // Check queue size
  console.log(`Queue size: ${queue.size()} files\n`);

  // List all items
  console.log('Current queue:');
  const items = queue.list();
  items.forEach((item, index) => {
    const priority = item.priority > 0 ? ` [Priority: ${item.priority}]` : '';
    console.log(`  ${index + 1}. ${item.filePath}${priority}`);
  });
  console.log();

  // Simulate fixing tests
  console.log('Processing failed tests...\n');
  
  // Get next test (highest priority first)
  let nextTest = queue.dequeue();
  console.log(`Fixing: ${nextTest}`);
  console.log('  → Running test...');
  console.log('  → Test passed! ✓\n');

  // Peek at next without removing
  const peekTest = queue.peek();
  console.log(`Next in queue: ${peekTest}\n`);

  // Simulate a test that fails again
  nextTest = queue.dequeue();
  console.log(`Fixing: ${nextTest}`);
  console.log('  → Running test...');
  console.log('  → Test failed again!');
  console.log('  → Re-adding with higher priority\n');
  queue.enqueue(nextTest, 15);

  // Search for specific tests
  console.log('Searching for API tests...');
  const apiTests = queue.search('api');
  console.log(`Found ${apiTests.length} API tests:`);
  apiTests.forEach(test => {
    console.log(`  - ${test.filePath}`);
  });
  console.log();

  // Get statistics
  console.log('Queue Statistics:');
  const stats = queue.getStats();
  console.log(`  Total items: ${stats.totalItems}`);
  console.log(`  Average failure count: ${stats.averageFailureCount.toFixed(2)}`);
  
  if (stats.oldestItem) {
    console.log(`  Oldest test: ${stats.oldestItem.filePath}`);
  }
  
  console.log('\nItems by priority:');
  stats.itemsByPriority.forEach((count, priority) => {
    console.log(`  Priority ${priority}: ${count} items`);
  });
  console.log();

  // Check if specific file exists
  const testFile = 'tests/utils/helpers.test.js';
  if (queue.contains(testFile)) {
    console.log(`✓ ${testFile} is in the queue`);
  }

  // Remove a specific file
  const removed = queue.remove('tests/utils/validators.test.js');
  if (removed) {
    console.log('✓ Removed tests/utils/validators.test.js from queue\n');
  }

  // Final queue state
  console.log(`Final queue size: ${queue.size()} files\n`);

  // Clean up
  queue.close();
  console.log('✓ Database connection closed');
  console.log('\n===================================');
  console.log('Example completed successfully!');
  console.log('\nTry the CLI commands:');
  console.log('  tfq list');
  console.log('  tfq add mytest.js --priority 5');
  console.log('  tfq next');
  console.log('  tfq stats');
}

// Run the example
main().catch(console.error);