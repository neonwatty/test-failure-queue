# Rails 8 + Test Failure Queue (TFQ) Integration

This example demonstrates how TFQ seamlessly integrates with Ruby on Rails 8 applications, providing intelligent test failure management for Rails' built-in Minitest framework.

## 🚀 Rails 8 Features Demonstrated

- **Model Tests**: ActiveRecord validations, associations, scopes
- **Controller Tests**: RESTful actions, authentication, authorization
- **System Tests**: Full-stack browser testing with Capybara
- **Rails 8 Specifics**: 
  - Propshaft for asset pipeline
  - Import maps for JavaScript
  - Turbo and Stimulus integration
  - Active Record encryption support

## 📁 Project Structure

```
rails8/
├── app/
│   ├── models/
│   │   └── user.rb              # User model with validations
│   └── controllers/
│       └── users_controller.rb   # RESTful controller
├── config/
│   └── application.rb            # Rails 8 configuration
├── test/
│   ├── test_helper.rb           # Test configuration
│   ├── models/
│   │   └── user_test.rb         # Model tests (3 failures)
│   ├── controllers/
│   │   └── users_controller_test.rb  # Controller tests (3 failures)
│   └── system/
│       └── users_test.rb        # System tests (3 failures)
├── Gemfile                       # Rails 8 dependencies
└── .tfqrc                        # TFQ configuration
```

## 🔧 Setup

### Prerequisites

- Ruby 3.1.0 or higher
- Bundler installed
- Node.js for Rails 8 JavaScript tooling

### Installation

```bash
# Install dependencies
bundle install

# Setup database (if running full Rails)
rails db:create db:migrate db:seed

# Install JavaScript dependencies (if running full Rails)
rails importmap:install
rails turbo:install stimulus:install
```

## 🧪 Running Tests

### Standard Rails Testing

```bash
# Run all tests
rails test

# Run specific test types
rails test test/models
rails test test/controllers
rails test:system

# Run specific test file
rails test test/models/user_test.rb

# Run specific test by line number
rails test test/models/user_test.rb:45
```

### Using TFQ with Rails

#### Auto-Detection

TFQ automatically detects Rails projects and uses the appropriate test command:

```bash
# From Rails root directory
../../../bin/tfq run-tests --auto-detect
```

#### Explicit Rails/Minitest

```bash
# Specify framework explicitly
../../../bin/tfq run-tests --language ruby --framework minitest

# Run specific test suite
../../../bin/tfq run-tests "rails test test/models"
```

#### Managing Test Failures

```bash
# Queue all failures
../../../bin/tfq run-tests --auto-detect

# View queued failures
../../../bin/tfq show

# Run highest priority failure
../../../bin/tfq run-next

# Run specific test file from queue
../../../bin/tfq run-next --file test/models/user_test.rb

# Clear resolved failures
../../../bin/tfq clear --resolved
```

## 🎯 Intentional Test Failures

This example includes 9 intentional failures to demonstrate TFQ's capabilities:

### Model Tests (3 failures)
1. `test "FAILING: adult? should incorrectly return true for nil age"` - Logic error
2. `test "FAILING: name should allow single character"` - Validation expectation mismatch
3. `test "FAILING: email should be case sensitive"` - Incorrect uniqueness assumption

### Controller Tests (3 failures)
1. `test "FAILING: should return JSON for index"` - Missing JSON format support
2. `test "FAILING: should paginate users on index"` - Missing pagination
3. `test "FAILING: should handle user not found gracefully"` - Error handling issue

### System Tests (3 failures)
1. `test "FAILING: should have live search"` - Missing frontend feature
2. `test "FAILING: should auto-save draft"` - Missing draft functionality
3. `test "FAILING: should have infinite scroll"` - Missing infinite scroll

## 📋 TFQ Configuration

The `.tfqrc` file is configured specifically for Rails:

```json
{
  "language": "ruby",
  "framework": "minitest",
  "testCommand": "rails test",
  "failurePattern": "rails test (.+?):(\\d+)",
  "testSuites": {
    "models": "rails test test/models",
    "controllers": "rails test test/controllers",
    "system": "rails test:system"
  }
}
```

## 🔄 Workflow Example

### 1. Initial Test Run

```bash
rails test
# Output: 45 tests, 9 failures
```

### 2. Queue Failures with TFQ

```bash
../../../bin/tfq run-tests --auto-detect
# TFQ detects Rails project
# Captures 9 failing tests with file:line references
```

### 3. Prioritize System Tests

```bash
../../../bin/tfq update test/system/users_test.rb --priority 10
```

### 4. Fix High-Priority Tests First

```bash
../../../bin/tfq run-next
# Runs highest priority failure
# Fix the test...
../../../bin/tfq clear --resolved
```

### 5. Run Specific Test Suite

```bash
../../../bin/tfq run-tests "rails test test/models" --queue-failures
# Queue only model test failures
```

## 🎨 Rails-Specific Features

### Parallel Testing

Rails 8 supports parallel testing by default:

```ruby
class ActiveSupport::TestCase
  parallelize(workers: :number_of_processors)
end
```

TFQ correctly handles parallel test output.

### System Tests

Rails system tests use Capybara and Selenium:

```ruby
class UsersTest < ApplicationSystemTestCase
  test "visiting the index" do
    visit users_url
    assert_selector "h1", text: "Users"
  end
end
```

TFQ captures system test failures including screenshot paths.

### Test Fixtures

Rails uses fixtures for test data:

```ruby
class UserTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
  end
end
```

### Custom Assertions

Rails provides additional assertions:

```ruby
assert_difference "User.count" do
  post users_url, params: { user: valid_attributes }
end

assert_emails 1 do
  UserMailer.welcome(@user).deliver_later
end
```

## 🐛 Debugging Tips

### Rails Test Commands

```bash
# Run tests with verbose output
rails test -v

# Run tests with specific seed
rails test --seed 12345

# Run tests with backtrace
rails test --backtrace

# Profile test performance
rails test --profile
```

### TFQ Integration

```bash
# Debug TFQ detection
../../../bin/tfq run-tests --verbose

# Check TFQ configuration
../../../bin/tfq config

# List supported frameworks
../../../bin/tfq languages
```

## 📊 Test Output Example

```
Run options: --seed 42

# Running:

F.F..F.......F.F..F...F.F..F.........

Finished in 3.456789s, 13.0208 runs/s, 15.6250 assertions/s.

  1) Failure:
UserTest#test_FAILING:_adult?_should_incorrectly_return_true_for_nil_age [test/models/user_test.rb:103]:
Expected adult? to return true for nil age (incorrect expectation)

rails test test/models/user_test.rb:101

45 runs, 54 assertions, 9 failures, 0 errors, 0 skips
```

## 🚦 CI/CD Integration

### GitHub Actions

```yaml
- name: Run Rails tests with TFQ
  run: |
    bundle exec rails test
    npx tfq run-tests --auto-detect --json-output > test-results.json
    npx tfq clear --resolved
```

### GitLab CI

```yaml
test:
  script:
    - bundle exec rails test
    - tfq run-tests --auto-detect
    - tfq export --format junit > test-results.xml
  artifacts:
    reports:
      junit: test-results.xml
```

## 📝 Notes

- This example uses mock implementations to demonstrate Rails patterns
- For a full Rails application, run `rails new` and integrate TFQ
- Rails 8 requires Ruby 3.1.0 or higher
- System tests require Chrome/Chromium for headless testing
- TFQ automatically detects Rails projects via `config/application.rb`

## 🔗 Resources

- [Rails 8 Release Notes](https://rubyonrails.org/2024/11/7/rails-8-0-has-been-released)
- [Rails Testing Guide](https://guides.rubyonrails.org/testing.html)
- [Minitest Documentation](https://github.com/minitest/minitest)
- [TFQ Documentation](../../../docs/USER_GUIDE.md)