#!/bin/bash

# Demo script showing intelligent test grouping with tfq
# This demonstrates how Claude Code or other tools can optimize test execution

echo "=== TFQ Grouping Demo ==="
echo ""

# Path to tfq (assuming we're running from examples/grouping/javascript)
TFQ="../../../bin/tfq"

# Clean up any existing queue
echo "1. Clearing existing queue..."
$TFQ clear --confirm > /dev/null 2>&1

# Add some failing tests to the queue
echo "2. Adding test failures to queue..."
$TFQ add tests/auth.test.js --priority 5
$TFQ add tests/api.test.js --priority 5  
$TFQ add tests/database.test.js --priority 3
$TFQ add tests/ui/button.test.js --priority 2
$TFQ add tests/ui/form.test.js --priority 2
$TFQ add tests/utils/math.test.js --priority 1

echo ""
echo "3. Current queue status:"
$TFQ list

# Set up intelligent grouping
echo ""
echo "4. Setting up execution groups based on dependency analysis..."
echo "   - Group 1 (parallel): auth, api, math tests (independent)"
echo "   - Group 2 (sequential): database test (stateful)"
echo "   - Group 3 (sequential): UI tests (share DOM utilities)"

# Create grouping plan with absolute paths
cat > grouping-plan.json << EOF
{
  "groups": [
    [
      "/Users/jeremywatt/Desktop/temp/examples/grouping/javascript/tests/auth.test.js",
      "/Users/jeremywatt/Desktop/temp/examples/grouping/javascript/tests/api.test.js",
      "/Users/jeremywatt/Desktop/temp/examples/grouping/javascript/tests/utils/math.test.js"
    ],
    ["/Users/jeremywatt/Desktop/temp/examples/grouping/javascript/tests/database.test.js"],
    [
      "/Users/jeremywatt/Desktop/temp/examples/grouping/javascript/tests/ui/button.test.js",
      "/Users/jeremywatt/Desktop/temp/examples/grouping/javascript/tests/ui/form.test.js"
    ]
  ]
}
EOF

$TFQ set-groups --file grouping-plan.json

echo ""
echo "5. Viewing execution groups:"
$TFQ get-groups

echo ""
echo "6. Checking group statistics:"
$TFQ group-stats

echo ""
echo "7. Executing groups (simulating Claude Code workflow):"
echo ""

# Execute first group (parallel)
echo "   Dequeuing Group 1 (parallel execution)..."
GROUP1=$($TFQ next --group --json | jq -r '.tests[]' 2>/dev/null)
if [ ! -z "$GROUP1" ]; then
    echo "   ⚡ Executing in parallel:"
    echo "$GROUP1" | while read test; do
        echo "      - $test"
    done
    echo "   [Simulating parallel test fixes with Task tool...]"
    echo ""
fi

# Execute second group (sequential)
echo "   Dequeuing Group 2 (sequential execution)..."
GROUP2=$($TFQ next --group --json | jq -r '.tests[]' 2>/dev/null)
if [ ! -z "$GROUP2" ]; then
    echo "   → Executing sequentially:"
    echo "$GROUP2" | while read test; do
        echo "      - $test"
    done
    echo "   [Simulating sequential test fix...]"
    echo ""
fi

# Execute third group (sequential)
echo "   Dequeuing Group 3 (sequential execution)..."
GROUP3=$($TFQ next --group --json | jq -r '.tests[]' 2>/dev/null)
if [ ! -z "$GROUP3" ]; then
    echo "   → Executing sequentially:"
    echo "$GROUP3" | while read test; do
        echo "      - $test"
    done
    echo "   [Simulating sequential test fixes...]"
    echo ""
fi

echo "8. Final queue status:"
$TFQ list

echo ""
echo "=== Demo Complete ==="
echo ""
echo "This demonstrates how tfq's grouping feature enables:"
echo "- Intelligent test organization based on dependencies"
echo "- Parallel execution of independent tests"
echo "- Sequential execution of dependent tests"
echo "- Optimal test fixing workflow for Claude Code"

# Clean up
rm -f grouping-plan.json