#!/bin/bash

# Test script to verify example projects work correctly with tfq
# This tests that:
# 1. Each language detects the correct number of test files
# 2. Implementation files are excluded
# 3. No line numbers are included

set -e

echo "Testing TFQ with example projects..."
echo "===================================="

# Build the project first
echo "Building project..."
npm run build

# Test Ruby/Minitest
echo -e "\n1. Testing Ruby/Minitest..."
cd examples/projects/ruby
../../../bin/tfq clear --confirm > /dev/null 2>&1
OUTPUT=$(../../../bin/tfq run-tests --language ruby --framework minitest --auto-add --json 2>/dev/null)
FAILURE_COUNT=$(echo "$OUTPUT" | jq '.failingTests | length')
if [ "$FAILURE_COUNT" -eq 2 ]; then
    echo "   ✓ Ruby: Detected exactly 2 test files"
else
    echo "   ✗ Ruby: Expected 2 test files, got $FAILURE_COUNT"
    echo "$OUTPUT" | jq '.failingTests'
fi

# Check for line numbers
if echo "$OUTPUT" | jq -r '.failingTests[]' | grep -q ':[0-9]\+$'; then
    echo "   ✗ Ruby: Found line numbers in test paths"
else
    echo "   ✓ Ruby: No line numbers in test paths"
fi

# Check that calculator.rb is not included
if echo "$OUTPUT" | jq -r '.failingTests[]' | grep -q 'calculator.rb'; then
    echo "   ✗ Ruby: Implementation file (calculator.rb) was incorrectly included"
else
    echo "   ✓ Ruby: Implementation file correctly excluded"
fi
cd ../../..

# Test JavaScript/Jest
echo -e "\n2. Testing JavaScript/Jest..."
cd examples/projects/javascript
../../../bin/tfq clear --confirm > /dev/null 2>&1
OUTPUT=$(../../../bin/tfq run-tests --language javascript --framework jest --auto-add --json 2>/dev/null)
FAILURE_COUNT=$(echo "$OUTPUT" | jq '.failingTests | length')
if [ "$FAILURE_COUNT" -eq 2 ]; then
    echo "   ✓ JavaScript: Detected exactly 2 test files"
else
    echo "   ✗ JavaScript: Expected 2 test files, got $FAILURE_COUNT"
    echo "$OUTPUT" | jq '.failingTests'
fi

# Check for line numbers
if echo "$OUTPUT" | jq -r '.failingTests[]' | grep -q ':[0-9]\+$'; then
    echo "   ✗ JavaScript: Found line numbers in test paths"
else
    echo "   ✓ JavaScript: No line numbers in test paths"
fi

# Check that calculator.js is not included
if echo "$OUTPUT" | jq -r '.failingTests[]' | grep -q 'calculator.js'; then
    echo "   ✗ JavaScript: Implementation file (calculator.js) was incorrectly included"
else
    echo "   ✓ JavaScript: Implementation file correctly excluded"
fi
cd ../../..

# Test TypeScript/Vitest
echo -e "\n3. Testing TypeScript/Vitest..."
cd examples/projects/typescript
../../../bin/tfq clear --confirm > /dev/null 2>&1
OUTPUT=$(../../../bin/tfq run-tests --language javascript --framework vitest --auto-add --json 2>/dev/null)
FAILURE_COUNT=$(echo "$OUTPUT" | jq '.failingTests | length')
if [ "$FAILURE_COUNT" -eq 2 ]; then
    echo "   ✓ TypeScript: Detected exactly 2 test files"
else
    echo "   ✗ TypeScript: Expected 2 test files, got $FAILURE_COUNT"
    echo "$OUTPUT" | jq '.failingTests'
fi

# Check for line numbers
if echo "$OUTPUT" | jq -r '.failingTests[]' | grep -q ':[0-9]\+$'; then
    echo "   ✗ TypeScript: Found line numbers in test paths"
else
    echo "   ✓ TypeScript: No line numbers in test paths"
fi

# Check that calculator.ts is not included
if echo "$OUTPUT" | jq -r '.failingTests[]' | grep -q 'calculator.ts'; then
    echo "   ✗ TypeScript: Implementation file (calculator.ts) was incorrectly included"
else
    echo "   ✓ TypeScript: Implementation file correctly excluded"
fi
cd ../../..

# Test Python/Pytest
echo -e "\n4. Testing Python/Pytest..."
cd examples/projects/python
../../../bin/tfq clear --confirm > /dev/null 2>&1
OUTPUT=$(../../../bin/tfq run-tests --language python --framework pytest --auto-add --json 2>/dev/null)
FAILURE_COUNT=$(echo "$OUTPUT" | jq '.failingTests | length')
if [ "$FAILURE_COUNT" -eq 2 ]; then
    echo "   ✓ Python: Detected exactly 2 test files"
else
    echo "   ✗ Python: Expected 2 test files, got $FAILURE_COUNT"
    echo "$OUTPUT" | jq '.failingTests'
fi

# Check for line numbers
if echo "$OUTPUT" | jq -r '.failingTests[]' | grep -q ':[0-9]\+$'; then
    echo "   ✗ Python: Found line numbers in test paths"
else
    echo "   ✓ Python: No line numbers in test paths"
fi

# Check that calculator.py is not included
if echo "$OUTPUT" | jq -r '.failingTests[]' | grep -q '^calculator.py$\|/calculator.py$'; then
    echo "   ✗ Python: Implementation file (calculator.py) was incorrectly included"
else
    echo "   ✓ Python: Implementation file correctly excluded"
fi
cd ../../..

# Test deduplication
echo -e "\n5. Testing deduplication..."
cd examples/projects/ruby
../../../bin/tfq clear --confirm > /dev/null 2>&1
../../../bin/tfq run-tests --language ruby --framework minitest --auto-add > /dev/null 2>&1
../../../bin/tfq run-tests --language ruby --framework minitest --auto-add > /dev/null 2>&1
STATS=$(../../../bin/tfq stats --json 2>/dev/null)
TOTAL=$(echo "$STATS" | jq '.total')
AVG_FAILURES=$(echo "$STATS" | jq '.averageFailureCount')

if [ "$TOTAL" -eq 2 ]; then
    echo "   ✓ Deduplication: Queue has exactly 2 unique files after duplicate runs"
else
    echo "   ✗ Deduplication: Expected 2 unique files, got $TOTAL"
fi

if [ "$AVG_FAILURES" = "2" ]; then
    echo "   ✓ Failure count: Each file has failure count of 2"
else
    echo "   ✗ Failure count: Expected average failure count of 2, got $AVG_FAILURES"
fi
cd ../../..

echo -e "\n===================================="
echo "Test complete!"