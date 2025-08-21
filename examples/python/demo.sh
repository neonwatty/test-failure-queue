#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   TFQ Demo - Python (Pytest) Calculator${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function to pause and wait for user
pause() {
    echo ""
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read -r
}

# Check if pytest is available
check_pytest() {
    if command -v pytest &> /dev/null; then
        return 0
    elif [ -f "venv/bin/pytest" ]; then
        return 0
    else
        echo -e "${RED}Warning: pytest not found. Setting up virtual environment...${NC}"
        python3 -m venv venv
        ./venv/bin/pip install -r requirements.txt 2>/dev/null || pip install pytest
        return 0
    fi
}

# Step 0: Check pytest and reset to buggy state
echo -e "${GREEN}📦 Step 0: Setting up and resetting to buggy state...${NC}"
check_pytest
./reset.sh
echo ""

# Step 1: Show the buggy code
echo -e "${GREEN}📝 Step 1: Let's look at the buggy calculator.py${NC}"
echo "The calculator has intentional bugs:"
echo "  - Float precision not handled with pytest.approx"
echo "  - History list grows without limit"
echo "  - Wrong exception type expected in tests"
pause

# Step 2: Run tests to see failures
echo -e "${GREEN}🧪 Step 2: Running tests to see failures...${NC}"
echo -e "${BLUE}Command: pytest test_advanced.py -v${NC}"
pause
if [ -f "venv/bin/pytest" ]; then
    venv/bin/pytest test_advanced.py -v 2>&1 | head -40
else
    pytest test_advanced.py -v 2>&1 | head -40
fi
echo "... (output truncated)"
pause

# Step 3: Use TFQ to detect and queue failures
echo -e "${GREEN}🔍 Step 3: Using TFQ to detect failures and add to queue${NC}"
echo -e "${BLUE}Command: ../../../bin/tfq run-tests --language python --framework pytest --auto-add --priority 7${NC}"
pause
../../../bin/tfq run-tests --language python --framework pytest --auto-add --priority 7
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

# Step 6: Clear the queue
echo -e "${GREEN}🧹 Step 6: Clear the queue${NC}"
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
echo "  ✅ Detected failing tests using pytest framework"
echo "  ✅ Added failures to TFQ queue with priority levels"
echo "  ✅ Viewed queue contents and statistics"
echo "  ✅ Managed queue (clear, dequeue, etc.)"
echo ""
echo "TFQ Core Features:"
echo "  - Multi-language support (JavaScript, Python, Ruby, TypeScript)"
echo "  - Multiple test framework support (pytest, unittest, nose2, Django)"
echo "  - Priority-based queue management"
echo "  - Persistent SQLite storage"
echo "  - Auto-detection of language and framework"
echo ""
echo "You can:"
echo "  - Run ${BLUE}./reset.sh${NC} to reset and try again"
echo "  - Run ${BLUE}../../../bin/tfq --help${NC} to see all commands"
echo "  - Manually fix the bugs in calculator.py"
echo "  - Use Claude Code's Task tool for AI-powered fixes"