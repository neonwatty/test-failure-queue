# /tfq-fix-all - Complete Automated Test Fixing

## Description
Runs tests to discover failures, then iteratively fixes each test one by one until the queue is empty or maximum iterations are reached.

## Configuration
- Maximum iterations: 20 tests (configurable)
- Verify all tests pass after completion
- Clear queue on success

## Implementation

### Step 1: Clear Queue and Run Tests (Task Agent)
Launch a Task agent to:
- Use the Bash tool to clear existing queue with `tfq clear --confirm`
- Use the Bash tool to run `tfq run-tests --auto-detect --auto-add --json` to populate queue
- Use the Bash tool to execute `tfq list --json` to get the queue contents
- Return the list of failed test paths

### Step 2: Iterative Fixing
Loop through the failed tests from Step 1:
- Use the Bash tool to get next test with `tfq next --json` (dequeues it)
- Launch Task agent to fix that specific test
- Task agent should:
  - Use the Read tool to read and understand the failing test
  - Use the Read tool to find the root cause in source files
  - Use the Edit tool to fix the bug
  - Use the Bash tool to verify the fix by running the test
- Track success/failure counts
- Continue until queue empty or max iterations reached

### Step 3: Final Verification (Task Agent)
Launch a Task agent to:
- Use the Bash tool to run `tfq run-tests --auto-detect --json` to verify all tests pass
- If all tests pass, use the Bash tool to clear queue with `tfq clear --confirm`
- Return final statistics

## Workflow Summary

1. **Task Agent**: Clear queue, then populate with fresh test failures
2. **Loop**: Fix tests one by one using tfq CLI and Task agents
3. **Task Agent**: Verify and clean up using tfq CLI

## Error Handling

- Continue processing even if individual fixes fail
- Track both successes and failures
- Save progress in queue for resumption if interrupted