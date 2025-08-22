# /tfq-reset - Reset Test Queue

## Description
Clears the test failure queue using the tfq CLI.

## Implementation

### Clear Entire Queue
Use the Bash tool to execute:
```bash
tfq clear --confirm
```

This removes all tests from the queue and resets it to empty state.


## Error Handling

- If queue is already empty, notify user
- Handle database errors gracefully