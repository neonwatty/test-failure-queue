# TFQ Provider Demos - Quick Start Guide

Get up and running with TFQ - find failed tests and fix them one at a time leveraging Claude Code.

## Prerequisites Checklist

- [ ] **Claude Code** installed from [claude.ai/code](https://claude.ai/code)
- [ ] **Node.js** 14+ installed
- [ ] **Python** 3.6+ installed (for Python demo)
- [ ] **TFQ** installed globally: `npm install -g tfq`

## End-to-End Demo

```bash
# Clone or navigate to the examples
cd examples/providers

# Run the complete multi-language demo
./run-all-demos.sh
```

This shows TFQ collecting and then fixing bugs in both JavaScript and Python projects leveraging Claude Code.

## ⚡ Language-Specific Quick Starts

### JavaScript
```bash
cd javascript-calculator
./demo.sh  # Interactive walkthrough
```

**Or manually in 3 commands:**
```bash
npm install && npm test                    # See failures
tfq run-tests --auto-detect --auto-add     # Queue failures
tfq fix-tests --verbose                    # Fix with Claude Code
```

### Python
```bash
cd python-math-utils
./demo.sh  # Interactive walkthrough
```

**Or manually in 4 commands:**
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt && pytest  # See failures
tfq run-tests --language python --auto-add # Queue failures
tfq fix-tests --verbose                    # Fix with AI
```

## Copy-Paste Workflow

### For a general JavaScript / Typescript Project
```bash
# In your project directory with failing tests:
tfq run-tests --auto-detect --auto-add && tfq fix-tests --verbose
```

### For a general Python Project
```bash
# In your project directory with failing tests:
tfq run-tests --language python --framework pytest --auto-add && tfq fix-tests --verbose
```

### For Ruby Projects
```bash
# In your project directory with failing tests:
tfq run-tests --language ruby --framework minitest --auto-add && tfq fix-tests --verbose
```

## Essential Commands

| Command | What it does |
|---------|--------------|
| `tfq run-tests --auto-add` | Run tests and queue failures |
| `tfq list` | View queued test failures |
| `tfq stats` | Show queue statistics |
| `tfq fix-tests --dry-run` | Preview fixes without applying |
| `tfq fix-tests --verbose` | Apply fixes with detailed output |
| `tfq clear` | Clear the queue |
| `tfq --help` | Show all commands |

## Interactive Features

### See What Will Be Fixed
```bash
tfq fix-tests --dry-run
```

### Watch Claude Code Think
```bash
tfq fix-tests --verbose
```

### Process High-Priority Items First
```bash
tfq add failing-test.js --priority 10
tfq fix-tests  # Processes priority 10 first
```

## Troubleshooting - Quick Fixes

### Claude Code Not Working?
```bash
# 1. Check Claude Code is running
ps aux | grep -i claude

# 2. Try opening Claude Code desktop app
# 3. Sign in if needed
```

### Tests Not Detected?
```bash
# Explicitly specify language and framework
tfq run-tests --language javascript --framework jest --auto-add
tfq run-tests --language python --framework pytest --auto-add
```

### Queue Issues?
```bash
tfq list   # Check what's queued
tfq clear  # Start fresh
tfq stats  # See queue statistics
```

### Python Virtual Environment?
```bash
# Always activate venv first
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
```

## Resetting to Broken State

Try to go from broken tests to all passing:

1. `cd javascript-calculator`
2. `./reset.sh` (reset to broken state)
3. `tfq run-tests --auto-detect --auto-add`
4. `tfq fix-tests`
5. `npm test` (verify all pass)

## Next Steps

- 📖 Read the [full documentation](../../README.md)
- 🔧 Explore [configuration options](configs/)
- 🎓 Try the [JavaScript demo](javascript-calculator/) in detail
- 🐍 Try the [Python demo](python-math-utils/) in detail
