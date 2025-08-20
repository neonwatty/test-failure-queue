# Rails 8 Test Example with Minitest

A Rails 8 application demonstrating test-driven development with Minitest and Test Failure Queue (TFQ) integration.

## Project Structure

```
rails8/
├── app/
│   ├── controllers/
│   │   └── users_controller.rb
│   └── models/
│       └── user.rb
├── test/
│   ├── controllers/
│   │   └── users_controller_test.rb  # Controller tests (all pass)
│   ├── models/
│   │   └── user_test.rb              # Model tests (4 failing tests)
│   └── test_helper.rb                 # Rails test configuration
├── config/
│   └── database.yml                   # SQLite database config
└── .tfqrc                              # TFQ configuration
```

## Requirements

- Ruby >= 3.0.0
- Rails >= 8.0.0
- SQLite3
- Bundler

## Setup

Install dependencies:
```bash
bundle install
```

Setup database:
```bash
rails db:create
rails db:migrate
```

## Running Tests

### Standard Rails Test Execution

Run all tests:
```bash
rails test
```

Run specific test file:
```bash
rails test test/models/user_test.rb
rails test test/controllers/users_controller_test.rb
```

### Using Test Failure Queue (TFQ)

#### Local TFQ (from project directory)

Auto-detect Rails/Minitest:
```bash
../../../bin/tfq run-tests --auto-detect
```

Explicitly specify framework:
```bash
../../../bin/tfq run-tests --language ruby --framework minitest
```

#### Global TFQ (if installed)

```bash
npm install -g tfq
tfq run-tests --auto-detect
```

## Test Implementation Details

### User Model
- Validates presence of name and email
- Validates email uniqueness (case-insensitive)
- Validates minimum age (13 years)
- Validates minimum name length (2 characters)
- Provides `adult?` method for age >= 18

### Users Controller
- RESTful JSON API endpoints
- Index, show, and create actions
- Input validation with error responses
- All controller tests pass

### Test Files

**test/controllers/users_controller_test.rb**:
- Tests for successful index and show actions
- Tests for user creation with valid/invalid params
- All tests pass

**test/models/user_test.rb**:
- Tests for model validations
- Tests for business logic (adult? method)
- 4 intentionally failing tests to demonstrate TFQ:
  1. Expects `adult?` to return true for nil age
  2. Expects single character names to be valid
  3. Expects age 12 to be valid
  4. Expects email uniqueness to be case-sensitive

## Rails Testing Features Demonstrated

- ActiveSupport::TestCase for model tests
- ActionDispatch::IntegrationTest for controller tests
- Fixtures and factory-style test data creation
- JSON API testing patterns
- Assertion helpers:
  - `assert` / `assert_not` for boolean checks
  - `assert_difference` for database changes
  - `assert_response` for HTTP status codes

## TFQ Configuration

The `.tfqrc` file configures TFQ for Rails:
```json
{
  "language": "ruby",
  "framework": "minitest",
  "testCommand": "rails test",
  "testPattern": "test/**/*_test.rb",
  "failurePattern": "\\d+\\) (Error|Failure):",
  "priority": 1,
  "maxRetries": 3,
  "timeout": 60000
}
```

## Workflow Example

1. Run tests to see failures:
```bash
rails test
# Shows 4 failures in test/models/user_test.rb
```

2. Queue failures with TFQ:
```bash
../../../bin/tfq run-tests --auto-detect
# TFQ captures the 4 failing tests from user_test.rb
```

3. View queued failures:
```bash
../../../bin/tfq show
```

4. Process failures one by one:
```bash
../../../bin/tfq dequeue
# Fix the test
../../../bin/tfq dequeue
# Continue until queue is empty
```

## Test Output Example

```
Running 11 tests:

UsersControllerTest#test_should_get_index [PASS]
UsersControllerTest#test_should_show_user [PASS]
UsersControllerTest#test_should_create_user [PASS]
UsersControllerTest#test_should_not_create_user_with_invalid_params [PASS]

UserTest#test_should_be_valid_with_valid_attributes [PASS]
UserTest#test_name_should_be_present [PASS]
UserTest#test_email_should_be_present [PASS]
UserTest#test_FAILING:_adult?_should_incorrectly_return_true_for_nil_age [FAIL]
UserTest#test_FAILING:_name_should_allow_single_character [FAIL]
UserTest#test_FAILING:_age_should_be_at_least_13 [FAIL]
UserTest#test_FAILING:_email_should_be_case_sensitive [FAIL]

Finished in 0.123456s
11 tests, 15 assertions, 4 failures, 0 errors, 0 skips
```

## Database Schema

```ruby
create_table "users", force: :cascade do |t|
  t.string "name", null: false
  t.string "email", null: false
  t.integer "age"
  t.timestamps
  t.index ["email"], unique: true
end
```

## Debugging Tips

- Use `byebug` or `debugger` for breakpoints
- Check test.log for detailed request/response logs
- Use `rails console --sandbox` for safe experimentation
- Run with `BACKTRACE=1` for full error traces
- Use `--seed` option to reproduce test order issues