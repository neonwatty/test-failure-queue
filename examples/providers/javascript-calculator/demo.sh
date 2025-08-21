#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   TFQ Claude Code Demo - JavaScript Calculator${NC}"
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
echo -e "${GREEN}📝 Step 1: Let's look at the buggy calculator.js${NC}"
echo "The calculator has several intentional bugs:"
echo "  - add() uses subtraction instead of addition"
echo "  - multiply() uses addition instead of multiplication"
echo "  - divide() doesn't handle division by zero"
echo "  - power() uses multiplication instead of Math.pow()"
pause

# Step 2: Run tests to see failures
echo -e "${GREEN}🧪 Step 2: Running tests to see failures...${NC}"
echo -e "${BLUE}Command: npm test${NC}"
pause
npm test 2>&1 | head -30
echo "... (output truncated)"
pause

# Step 3: Use TFQ to detect and queue failures
echo -e "${GREEN}🔍 Step 3: Using TFQ to detect failures and add to queue${NC}"
echo -e "${BLUE}Command: ../../../bin/tfq run-tests --auto-detect --auto-add --priority 5${NC}"
pause
../../../bin/tfq run-tests --auto-detect --auto-add --priority 5
pause

# Step 4: View the queue
echo -e "${GREEN}📋 Step 4: Viewing the TFQ queue${NC}"
echo -e "${BLUE}Command: ../../../bin/tfq list${NC}"
pause
../../../bin/tfq list
pause

# Step 5: Check queue statistics
echo -e "${GREEN}📊 Step 5: Check queue statistics${NC}"
echo -e "${BLUE}Command: ../../../bin/tfq stats${NC}"
pause
../../../bin/tfq stats
pause

# Step 7: Apply the fixes
echo -e "${GREEN}🤖 Step 7: Apply Claude Code fixes${NC}"
echo -e "${BLUE}Command: ../../../bin/tfq fix-tests --verbose${NC}"
echo "Claude Code will now analyze and fix the bugs..."
pause
../../../bin/tfq fix-tests --verbose
pause

# Step 8: Verify tests pass
echo -e "${GREEN}✅ Step 8: Verify all tests now pass${NC}"
echo -e "${BLUE}Command: npm test${NC}"
pause
npm test
pause

# Step 9: Show the fixed code
echo -e "${GREEN}🎉 Step 9: Let's see what was fixed${NC}"
echo "Here's a sample of the fixed add function:"
echo ""
grep -A 3 "function add" calculator.js
echo ""
pause

# Completion
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Demo Complete! 🎉${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "What we demonstrated:"
echo "  ✅ Detected failing tests automatically"
echo "  ✅ Added failures to TFQ queue"
echo "  ✅ Used Claude Code to analyze and fix bugs"
echo "  ✅ Verified all tests pass after fixes"
echo ""
echo "You can:"
echo "  - Run ${BLUE}./reset.sh${NC} to reset and try again"
echo "  - Run ${BLUE}../../../bin/tfq stats${NC} to see queue statistics"
echo "  - Explore other TFQ commands with ${BLUE}../../../bin/tfq --help${NC}"