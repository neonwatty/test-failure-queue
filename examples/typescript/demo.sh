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

# Step 7: Clear the queue
echo -e "${GREEN}🧹 Step 7: Clear the queue${NC}"
echo "You can clear processed or all items from the queue:"
echo -e "${BLUE}Command: ../../../bin/tfq clear${NC}"
pause
../../../bin/tfq clear
pause

# Completion
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Demo Complete! 🎉${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "What we demonstrated:"
echo "  ✅ Detected failing tests using Vitest framework"
echo "  ✅ Added failures to TFQ queue with priority levels"
echo "  ✅ Viewed queue contents and statistics"
echo "  ✅ Managed queue (clear, dequeue, etc.)"
echo ""
echo "TFQ Core Features:"
echo "  - Multi-language support (JavaScript, Python, Ruby, TypeScript)"
echo "  - Multiple test framework support (Vitest, Jest, Mocha, Jasmine)"
echo "  - Priority-based queue management"
echo "  - Persistent SQLite storage"
echo "  - Auto-detection of language and framework"
echo ""
echo "You can:"
echo "  - Run ${BLUE}./reset.sh${NC} to reset and try again"
echo "  - Run ${BLUE}../../../bin/tfq --help${NC} to see all commands"
echo "  - Manually fix the bugs in src/calculator.ts"
echo "  - Use Claude Code's Task tool for AI-powered fixes"