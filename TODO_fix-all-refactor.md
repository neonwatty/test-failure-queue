# TODO: Refactor `tfq fix-all` to Use `fix-next` Logic

## Problem
Current `fix-all` uses batch processing without per-test verification, while `fix-next` has proven verification and re-queuing logic. We want `fix-all` to iterate over `fix-next` repeatedly for consistency and reliability.

## Implementation Plan

### Phase 1: Extract Shared Fix Logic
- [ ] **Create shared function** in Claude service: `fixNextTest()`
  - [ ] Extract core logic from `fix-next` command 
  - [ ] Include: dequeue → Claude fix → verification → re-queue on failure
  - [ ] Return: success status, test path, error details, verification results

### Phase 2: Refactor `fix-all` Command
- [ ] **Remove current batch approach**:
  - [ ] Remove: queue clearing, batch test running, batch fixing without verification
  - [ ] Keep: max iterations, progress tracking, statistics

- [ ] **Implement new iterative approach**:
  ```javascript
  for (let i = 0; i < maxIterations; i++) {
    if (queue.size() === 0) break; // Queue empty, we're done
    
    const fixResult = await claudeService.fixNextTest();
    
    if (!fixResult.testFound) break; // No more tests
    
    // Update statistics
    result.iterations++;
    if (fixResult.success) result.fixedTests++;
    else result.failedFixes++;
  }
  ```

- [ ] **Add final verification logic**:
  ```javascript
  if (queue.size() === 0) {
    // Queue empty - run all tests to check if truly done
    const testResult = runner.run();
    if (testResult.failingTests.length > 0) {
      // Add new failures back to queue
      testResult.failingTests.forEach(test => queue.enqueue(test));
    } else {
      result.allTestsPass = true;
    }
  }
  ```

### Phase 3: Update `fix-next` Command  
- [ ] **Use shared function** from Claude service
- [ ] **Maintain identical behavior** to current `fix-next`
- [ ] **Keep existing output formatting** and error handling

### Phase 4: Testing & Validation
- [ ] **Test `fix-next` still works** after refactoring
- [ ] **Test `fix-all` new behavior** with multiple failing tests
- [ ] **Verify progress tracking** and statistics are correct
- [ ] **Test max iterations limit** works properly
- [ ] **Test final verification** when queue becomes empty

## Benefits of This Change

1. **Reuses proven `fix-next` logic** - verification, re-queuing, error handling
2. **Better reliability** - each fix is verified before moving to next
3. **Consistent behavior** - same fix workflow whether using `fix-next` or `fix-all`  
4. **Progressive improvement** - fixes are verified incrementally
5. **Natural stopping** - queue empties when all tests actually pass

## Files to Modify

- [ ] `/src/services/claude/index.js` - Add shared `fixNextTest()` function
- [ ] `/src/cli.ts` - Refactor `fix-all` command logic  
- [ ] `/src/cli.ts` - Update `fix-next` command to use shared function
- [ ] Update tests in `/tests/services/claude/` if needed

## Current vs New Behavior

### Current `fix-all`:
1. Clear queue → Run tests → Add all failures  
2. Loop: dequeue test → attempt fix (no verification)
3. Final verification of all tests

### New `fix-all`:
1. Keep existing queue (don't clear)
2. Loop: call `fix-next` logic repeatedly until queue empty or max iterations
3. If queue is empty: run all tests and re-add any failures
4. If queue still has items: we're done (hit max iterations)

## Status
- [ ] Ready to implement
- [ ] Implementation started
- [ ] Implementation complete
- [ ] Testing complete
- [ ] Ready for review