#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   TFQ Demo - TypeScript (Vitest) Calculator${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to pause and wait for user
pause() {
    echo ""
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read -r
}

# Step 0: Reset to buggy state
echo -e "${GREEN}📦 Step 0: Resetting to buggy state...${NC}"
./reset.sh
echo ""

# Step 1: Show the buggy code
echo -e "${GREEN}📝 Step 1: Let's look at the buggy calculator.ts${NC}"
echo "The calculator has intentional bugs:"
echo "  - divide() returns Infinity instead of throwing for division by zero"
echo "  - sqrt() returns NaN instead of throwing for negative numbers"
pause

# Step 2: Build the TypeScript code
echo -e "${GREEN}🔨 Step 2: Building TypeScript...${NC}"
echo -e "${BLUE}Command: npm run build${NC}"
npm run build
pause

# Step 3: Run tests to see failures
echo -e "${GREEN}🧪 Step 3: Running tests to see failures...${NC}"
echo -e "${BLUE}Command: npm test${NC}"
pause
npm test 2>&1 | head -40
echo "... (output truncated)"
pause

# Step 4: Use TFQ to detect and queue failures
echo -e "${GREEN}🔍 Step 4: Using TFQ to detect failures and add to queue${NC}"
echo -e "${BLUE}Command: ../../../bin/tfq run-tests --language javascript --framework vitest --auto-add --priority 8${NC}"
pause
../../../bin/tfq run-tests --language javascript --framework vitest --auto-add --priority 8
pause

# Step 5: View the queue
echo -e "${GREEN}📋 Step 5: Viewing the TFQ queue${NC}"
echo -e "${BLUE}Command: ../../../bin/tfq list${NC}"
pause
../../../bin/tfq list
pause

# Step 6: Check queue statistics
echo -e "${GREEN}📊 Step 6: Check queue statistics${NC}"
echo -e "${BLUE}Command: ../../../bin/tfq stats${NC}"
pause
../../../bin/tfq stats
pause

# Step 7: Apply the fixes (if provider configured)
echo -e "${GREEN}🤖 Step 7: Apply fixes (requires Claude Code provider)${NC}"
echo "Note: This step requires the Claude Code provider to be configured."
echo "If not configured, you can manually fix the bugs or skip this step."
echo -e "${BLUE}Command: ../../../bin/tfq fix-tests --verbose${NC}"
pause
../../../bin/tfq fix-tests --verbose 2>&1 || echo -e "${YELLOW}Provider not configured or fix failed. You can manually fix the bugs.${NC}"
pause

# Step 8: Rebuild and verify tests pass
echo -e "${GREEN}✅ Step 8: Rebuild and run tests again${NC}"
echo -e "${BLUE}Command: npm run build && npm test${NC}"
pause
npm run build && npm test
pause

# Step 9: Show what was fixed
echo -e "${GREEN}🎉 Step 9: Review the changes${NC}"
echo "Let's see what was fixed in the divide function:"
echo ""
grep -A 5 "divide(a: number, b: number)" src/calculator.ts
echo ""
pause

# Completion
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Demo Complete! 🎉${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "What we demonstrated:"
echo "  ✅ TypeScript project with Vitest framework"
echo "  ✅ Detected edge case test failures"
echo "  ✅ Added failures to TFQ queue with higher priority"
echo "  ✅ Applied fixes to handle edge cases properly"
echo ""
echo "You can:"
echo "  - Run ${BLUE}./reset.sh${NC} to reset and try again"
echo "  - Run ${BLUE}../../../bin/tfq clear${NC} to clear the queue"
echo "  - Try ${BLUE}../../../bin/tfq run-tests --auto-detect${NC} for auto-detection"