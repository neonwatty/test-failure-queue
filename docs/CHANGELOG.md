# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-08-19

### Added
- Multi-language support for Ruby and Python
- Support for multiple test frameworks per language:
  - JavaScript: Jest, Mocha, Vitest, Jasmine, AVA
  - Ruby: Minitest, RSpec, Test::Unit, Cucumber
  - Python: pytest, unittest, Django, nose2
- New `languages` command to list supported languages and frameworks
- Language auto-detection based on project files
- `--language` flag for specifying programming language
- `--auto-detect` flag for automatic language/framework detection
- `--list-frameworks` flag to show available frameworks for a language
- Configuration support for default language and test commands
- Extensible adapter pattern for adding new languages
- TestAdapterRegistry for managing language adapters

### Changed
- TestRunner now uses adapter pattern for language-specific logic
- Updated CLI to support multi-language operations
- Configuration file now includes language-specific settings
- Package description updated to reflect multi-language support
- Expanded test coverage for all supported languages

### Fixed
- Improved test failure pattern matching across different frameworks
- Better error handling for unsupported languages/frameworks

### Backward Compatibility
- All existing commands and API remain fully compatible
- Defaults to JavaScript/Jest when language is not specified
- No breaking changes to existing functionality

## [1.0.0] - 2025-08-18

### Initial Release
- Core test failure queue management
- SQLite-based persistent storage
- CLI interface with queue operations (add, next, peek, list, remove, clear)
- Support for JavaScript test frameworks (Jest, Mocha, Vitest)
- Test runner with automatic failure detection
- Priority-based queue ordering
- Configuration file support
- Pattern matching for file searches
- Statistics and reporting features