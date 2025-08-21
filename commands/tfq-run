# /tfq-run - Run Tests and Populate Queue

## Description
Runs all tests in the project and automatically adds failing tests to the TFQ queue for processing.

## Implementation

### 1. Run Tests with Auto-Add
Use the Bash tool to execute:
```bash
tfq run-tests --auto-detect --auto-add --json
```

### 2. Display Queue Status
Use the Bash tool to execute:
```bash
tfq list --json
```

Parse the JSON output to check if the queue has items. An empty items array means all tests passed.

## Options

### Specify Language/Framework
If auto-detection fails, specify explicitly using the Bash tool:
```bash
tfq run-tests --language javascript --framework jest --auto-add
```

### Clear Queue Before Running
To start fresh, use the Bash tool to execute:
```bash
tfq clear --confirm
tfq run-tests --auto-detect --auto-add
```

## Error Handling

- If no test framework is detected, suggest specifying language/framework
- If test command fails, show error and suggest manual configuration
- If queue operations fail, check TFQ_DB_PATH environment variable