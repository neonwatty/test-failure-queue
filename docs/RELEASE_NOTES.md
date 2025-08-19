# Release Notes - v2.0.0

## Test Failure Queue (TFQ) - Multi-Language Support Release

We're excited to announce the release of TFQ v2.0.0, a major update that transforms TFQ from a JavaScript-only tool into a powerful multi-language test failure queue manager.

### 🌟 Highlights

**Multi-Language Support**: TFQ now supports JavaScript, Ruby, and Python with their most popular test frameworks.

**Auto-Detection**: Automatically detects your project's language and test framework - just run `tfq run-tests --auto-detect`.

**Extensible Architecture**: Built on a new adapter pattern that makes it easy to add support for additional languages.

**Full Backward Compatibility**: All existing commands and configurations continue to work exactly as before.

### 🚀 New Features

#### Supported Languages and Frameworks

**JavaScript/TypeScript**
- Jest (default)
- Mocha
- Vitest
- Jasmine
- AVA

**Ruby**
- Minitest (default)
- RSpec
- Test::Unit
- Cucumber

**Python**
- pytest (default)
- unittest
- Django
- nose2

#### New Commands

```bash
# List all supported languages and frameworks
tfq languages

# Run tests with auto-detection
tfq run-tests --auto-detect

# Specify language explicitly
tfq run-tests --language ruby --framework rspec

# List frameworks for a specific language
tfq run-tests --language python --list-frameworks
```

#### Enhanced Configuration

The `.tfqrc` configuration file now supports language-specific settings:

```json
{
  "defaultLanguage": "javascript",
  "defaultFrameworks": {
    "javascript": "jest",
    "ruby": "minitest",
    "python": "pytest"
  },
  "testCommands": {
    "javascript:jest": "npm test",
    "ruby:rspec": "bundle exec rspec",
    "python:pytest": "pytest"
  }
}
```

### 💡 Usage Examples

```bash
# JavaScript project (backward compatible)
tfq run-tests "npm test"

# Ruby Rails project
tfq run-tests "rails test" --language ruby

# Python project with auto-detection
tfq run-tests --auto-detect

# Custom test command
tfq run-tests "bundle exec rspec spec/models" --language ruby --framework rspec
```

### 📦 Installation

```bash
npm install -g tfq
```

### 🔄 Migration Guide

**No migration required!** Version 2.0.0 is fully backward compatible. Your existing workflows will continue to work without any changes.

To take advantage of multi-language features:
1. Update to v2.0.0: `npm update -g tfq`
2. Regenerate your config file (optional): `tfq config --init`
3. Start using language flags or auto-detection

### 🐛 Bug Fixes

- Improved test failure pattern matching across different frameworks
- Better error handling for unsupported languages/frameworks
- Fixed regex pattern extraction for global patterns

### 🔮 What's Next

- Support for additional languages (Go, Java, C#)
- Plugin system for custom adapters
- Enhanced CI/CD integrations
- Parallel test execution support

### 📝 Documentation

Full documentation is available in the [User Guide](./USER_GUIDE.md) and [README](../README.md).

### 🙏 Acknowledgments

Thank you to all contributors and users who have provided feedback and suggestions for this release.

### 📞 Support

For issues or questions, please visit our [GitHub repository](https://github.com/your-org/tfq) or file an issue.

---

**Breaking Changes**: None - this release maintains full backward compatibility.

**Minimum Node.js version**: 18.0.0 or higher

**License**: MIT