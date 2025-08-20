ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment" rescue LoadError
require "rails/test_help"
require "minitest/autorun"
require "minitest/reporters"

Minitest::Reporters.use! Minitest::Reporters::SpecReporter.new

module ActiveSupport
  class TestCase
    parallelize(workers: :number_of_processors)
    
    fixtures :all if defined?(fixtures)
    
    def assert_valid(record, message = nil)
      assert record.valid?, message || "Expected #{record.inspect} to be valid but got errors: #{record.errors.full_messages.join(', ')}"
    end
    
    def assert_invalid(record, message = nil)
      assert_not record.valid?, message || "Expected #{record.inspect} to be invalid"
    end
    
    def assert_errors_on(record, attribute)
      assert record.errors[attribute].any?, "Expected errors on #{attribute} but got none"
    end
    
    def assert_no_errors_on(record, attribute)
      assert record.errors[attribute].empty?, "Expected no errors on #{attribute} but got: #{record.errors[attribute].join(', ')}"
    end
  end
end

module ActionDispatch
  class IntegrationTest
    def sign_in_as(user)
      post login_url, params: { email: user.email, password: 'password' }
    end
    
    def assert_redirected_back_or_to(default)
      assert_redirected_to(session[:return_to] || default)
    end
  end
end