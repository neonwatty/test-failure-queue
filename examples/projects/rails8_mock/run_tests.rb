#!/usr/bin/env ruby

# Mock test runner for Rails example that simulates test failures
# This demonstrates TFQ's ability to capture and queue test failures

class TestRunner
  def initialize
    @failures = []
    @passes = []
    @total = 0
  end
  
  def run_tests
    puts "Running Rails tests with Minitest..."
    puts ""
    
    # Simulate running model tests
    run_model_tests
    
    # Simulate running controller tests
    run_controller_tests
    
    # Simulate running system tests  
    run_system_tests
    
    # Print results
    print_results
  end
  
  private
  
  def run_model_tests
    print "test/models/user_test.rb "
    
    # Passing tests
    add_pass("test: should be valid with valid attributes")
    add_pass("test: name should be present")
    add_pass("test: email should be present")
    add_pass("test: email should be unique")
    add_pass("test: email should be saved as lowercase")
    add_pass("test: email validation should accept valid addresses")
    add_pass("test: email validation should reject invalid addresses")
    add_pass("test: password should have minimum length")
    add_pass("test: age should be numeric")
    add_pass("test: age can be nil")
    add_pass("test: full_name should combine first and last name")
    add_pass("test: adult? should return true for users 18 or older")
    add_pass("test: adult? should return false for users under 18")
    add_pass("test: activate! should set active to true and set activated_at")
    add_pass("test: deactivate! should set active to false and clear activated_at")
    add_pass("test: active scope should return only active users")
    add_pass("test: adults scope should return users 18 or older")
    add_pass("test: user should have many posts")
    add_pass("test: user should have many comments")
    add_pass("test: destroying user should destroy associated posts")
    
    # Failing tests
    add_failure("test/models/user_test.rb", 72, "test: FAILING: age should be at least 13", 
                "Expected age 12 to be valid (but minimum is 13)")
    add_failure("test/models/user_test.rb", 102, "test: FAILING: adult? should incorrectly return true for nil age",
                "Expected adult? to return true for nil age (incorrect expectation)")
    add_failure("test/models/user_test.rb", 122, "test: FAILING: name should allow single character",
                "Expected single character name to be valid (but minimum is 2)")
    add_failure("test/models/user_test.rb", 158, "test: FAILING: email should be case sensitive",
                "Expected email uniqueness to be case sensitive (but it's not)")
                
    puts "F.F..F.......F......."
  end
  
  def run_controller_tests
    print "test/controllers/users_controller_test.rb "
    
    # Passing tests
    add_pass("test: should get index")
    add_pass("test: should get new")
    add_pass("test: should create user")
    add_pass("test: should not create user with invalid params")
    add_pass("test: should get edit when logged in as same user")
    add_pass("test: should redirect edit when not logged in")
    add_pass("test: should redirect edit when logged in as different user")
    add_pass("test: should allow admin to edit any user")
    add_pass("test: should update user when logged in as same user")
    add_pass("test: should not update user with invalid params")
    add_pass("test: should destroy user when logged in as same user")
    add_pass("test: should not destroy user when not logged in")
    add_pass("test: should send welcome email after user creation")
    add_pass("test: should show recent posts on user show page")
    add_pass("test: should filter only active users on index")
    add_pass("test: should require strong parameters")
    
    # Failing tests
    add_failure("test/controllers/users_controller_test.rb", 51, "test: FAILING: should show user profile with avatar",
                "Expected user avatar image to be displayed")
    add_failure("test/controllers/users_controller_test.rb", 120, "test: FAILING: should return JSON for index with json format",
                "Expected JSON array with users")
    add_failure("test/controllers/users_controller_test.rb", 141, "test: FAILING: should paginate users on index",
                "Expected pagination controls")
    add_failure("test/controllers/users_controller_test.rb", 174, "test: FAILING: should handle user not found gracefully",
                "Expected :not_found but got :500")
                
    puts "....F...........F.F..F"
  end
  
  def run_system_tests
    print "test/system/users_test.rb "
    
    # Passing tests
    add_pass("test: visiting the index")
    add_pass("test: should create user")
    add_pass("test: should update User")
    add_pass("test: should destroy User")
    add_pass("test: should validate email format on frontend")
    add_pass("test: should show password strength indicator")
    add_pass("test: should show user profile with recent activity")
    add_pass("test: should handle responsive navigation")
    add_pass("test: should show loading state during form submission")
    add_pass("test: should display flash messages with appropriate styling")
    
    # Failing tests
    add_failure("test/system/users_test.rb", 70, "test: FAILING: should have live search on users index",
                "Expected live search functionality")
    add_failure("test/system/users_test.rb", 103, "test: FAILING: should auto-save draft when creating user",
                "Expected draft to be saved and restored")
    add_failure("test/system/users_test.rb", 144, "test: FAILING: should have infinite scroll on users index",
                "Expected infinite scroll instead of pagination")
                
    puts "......F..F...F"
  end
  
  def add_pass(test_name)
    @passes << test_name
    @total += 1
  end
  
  def add_failure(file, line, test_name, message)
    @failures << {
      file: file,
      line: line,
      test: test_name,
      message: message
    }
    @total += 1
  end
  
  def print_results
    puts "\n\nFinished in 3.456789s, 15.2381 runs/s, 18.2857 assertions/s.\n\n"
    
    # Print detailed failure information
    @failures.each_with_index do |failure, index|
      puts "  #{index + 1}) Failure:"
      puts "#{failure[:test]} [#{failure[:file]}:#{failure[:line]}]:"
      puts "#{failure[:message]}"
      puts ""
      puts "rails test #{failure[:file]}:#{failure[:line]}"
      puts ""
    end
    
    # Print summary
    puts "#{@total} runs, #{@total + 10} assertions, #{@failures.size} failures, 0 errors, 0 skips"
    
    # Exit with non-zero status if there are failures
    exit(1) if @failures.any?
  end
end

# Run the tests
TestRunner.new.run_tests