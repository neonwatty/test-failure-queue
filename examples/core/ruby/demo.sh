#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   TFQ Demo - Ruby (Minitest) Calculator${NC}"
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
echo -e "${GREEN}📝 Step 1: Let's look at the buggy calculator.rb${NC}"
echo "The calculator has intentional bugs:"
echo "  - divide() returns Rational instead of Float"
echo "  - add() concatenates strings instead of adding numbers"
echo "  - average() returns median instead of mean"
pause

# Step 2: Run tests to see failures
echo -e "${GREEN}🧪 Step 2: Running tests to see failures...${NC}"
echo -e "${BLUE}Command: ruby -Ilib:test test/edge_cases_test.rb${NC}"
pause
ruby -Ilib:test test/edge_cases_test.rb 2>&1 | head -40
echo "... (output truncated)"
pause

# Step 3: Use TFQ to detect and queue failures
echo -e "${GREEN}🔍 Step 3: Using TFQ to detect failures and add to queue${NC}"
echo -e "${BLUE}Command: ../../../bin/tfq run-tests --language ruby --framework minitest --auto-add --priority 6${NC}"
pause
../../../bin/tfq run-tests --language ruby --framework minitest --auto-add --priority 6
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

# Step 6: Apply the fixes (if provider configured)
echo -e "${GREEN}🤖 Step 6: Apply fixes (requires Claude Code provider)${NC}"
echo "Note: This step requires the Claude Code provider to be configured."
echo "If not configured, you can manually fix the bugs or skip this step."
echo -e "${BLUE}Command: ../../../bin/tfq fix-tests --verbose${NC}"
pause
../../../bin/tfq fix-tests --verbose 2>&1 || echo -e "${YELLOW}Provider not configured or fix failed. You can manually fix the bugs.${NC}"
pause

# Step 7: Verify tests pass
echo -e "${GREEN}✅ Step 7: Run tests again to check status${NC}"
echo -e "${BLUE}Command: ruby -Ilib:test test/edge_cases_test.rb${NC}"
pause
ruby -Ilib:test test/edge_cases_test.rb
pause

# Step 8: Show what was fixed
echo -e "${GREEN}🎉 Step 8: Review the changes${NC}"
echo "Let's see what was fixed in the divide method:"
echo ""
grep -A 5 "def divide" lib/calculator.rb
echo ""
pause

# Completion
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Demo Complete! 🎉${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "What we demonstrated:"
echo "  ✅ Ruby project with Minitest framework"
echo "  ✅ Detected type conversion and edge case failures"
echo "  ✅ Added failures to TFQ queue"
echo "  ✅ Applied fixes to handle types correctly"
echo ""
echo "You can:"
echo "  - Run ${BLUE}./reset.sh${NC} to reset and try again"
echo "  - Run ${BLUE}../../../bin/tfq clear${NC} to clear the queue"
echo "  - Try ${BLUE}../../../bin/tfq run-tests --auto-detect${NC} for auto-detection"