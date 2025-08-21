# TFQ Configuration Examples

This directory contains example `.tfqrc` configuration files for different project types and scenarios.

## 📁 Available Configurations

### javascript.tfqrc
Configuration optimized for JavaScript/TypeScript projects using Jest, Mocha, Vitest, or other JS testing frameworks.

**Use case:** Single-language JavaScript/TypeScript projects

**Key features:**
- Default to Jest framework
- Include TypeScript test files
- Exclude node_modules and build directories
- Custom system prompt for ES6+ best practices

### python.tfqrc
Configuration optimized for Python projects using pytest, unittest, or other Python testing frameworks.

**Use case:** Python applications and libraries

**Key features:**
- Default to pytest framework
- Virtual environment awareness
- Python 3.8+ compatibility
- PEP 8 style guidelines in system prompt

### multi-language.tfqrc
Configuration for projects with multiple programming languages (e.g., full-stack applications).

**Use case:** Monorepos, full-stack apps, microservices

**Key features:**
- Language-specific configurations
- Different priorities per language
- Separate test commands for each language
- Cross-language dependency awareness

### ci-cd.tfqrc
Configuration optimized for continuous integration and deployment pipelines.

**Use case:** GitHub Actions, Jenkins, CircleCI, GitLab CI

**Key features:**
- Non-interactive mode
- Faster timeouts
- JSON output format
- Dry-run by default
- Environment-specific overrides

## 🚀 How to Use

1. **Copy the appropriate config file to your project root:**
   ```bash
   cp javascript.tfqrc /path/to/your/project/.tfqrc
   ```

2. **Customize the configuration:**
   - Edit the `.tfqrc` file to match your project structure
   - Adjust priorities, timeouts, and patterns as needed
   - Modify the system prompt for your specific requirements

3. **Test the configuration:**
   ```bash
   # Check if TFQ recognizes your config
   tfq config
   
   # Run tests with the config
   tfq run-tests --auto-detect
   ```

## 📝 Configuration Options

### Global Settings
- `defaultLanguage`: Primary language for the project
- `autoDetect`: Enable automatic language/framework detection
- `testTimeout`: Maximum time for test execution (milliseconds)
- `maxRetries`: Number of retry attempts for failed fixes

### Queue Management
- `defaultPriority`: Default priority for queued items (1-10)
- `clearQueueOnStart`: Clear queue before adding new items
- `queuePersistence`: Enable persistent queue across sessions
- `queuePath`: Custom path for queue database

### Provider Settings
- `provider`: AI provider to use (e.g., "claude-code")
- `fixTestsOptions`: Options for the fix-tests command
  - `verbose`: Show detailed output
  - `dryRun`: Preview changes without applying
  - `maxIterations`: Maximum fix attempts

### File Patterns
- `includePatterns`: Glob patterns for test files to include
- `excludePatterns`: Glob patterns to exclude from processing

### Custom System Prompts
- `fixTestsSystemPrompt`: Custom instructions for the AI provider

## 🔧 Advanced Features

### Environment-Specific Overrides
```yaml
environments:
  development:
    fixTestsOptions:
      dryRun: false
      verbose: true
  production:
    autoFix: false
    dryRun: true
```

### Language-Specific Settings
```yaml
languages:
  javascript:
    framework: jest
    priority: 5
  python:
    framework: pytest
    priority: 8
```

### CI/CD Integration
```yaml
ci:
  outputFormat: json
  generateReport: true
  reportPath: "tfq-report.json"
  maxFailures: 10
```

## 💡 Tips

1. **Start Simple**: Begin with a basic configuration and add complexity as needed
2. **Version Control**: Commit your `.tfqrc` file to share settings with your team
3. **Environment Variables**: Override config values with `TFQ_*` environment variables
4. **Validate Config**: Use `tfq config --validate` to check for errors
5. **Multiple Configs**: Use `--config` flag to specify different config files

## 📖 See Also

- [TFQ Documentation](../../../../README.md)
- [Provider Examples](../)
- [JavaScript Demo](../javascript-calculator/)
- [Python Demo](../python-math-utils/)