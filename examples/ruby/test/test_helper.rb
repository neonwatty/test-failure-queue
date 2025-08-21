require 'minitest/autorun'
require 'minitest/reporters'

# Use the Spec reporter for more readable output
Minitest::Reporters.use! Minitest::Reporters::SpecReporter.new

# Optional: Add SimpleCov for code coverage
begin
  require 'simplecov'
  SimpleCov.start do
    add_filter '/test/'
  end
rescue LoadError
  # SimpleCov not available, continue without coverage
end

# Add lib directory to load path
$LOAD_PATH.unshift File.expand_path('../lib', __dir__)

# Common test utilities
class Minitest::Test
  # Add any shared test helpers here
  
  # Helper method for asserting that a block does not raise an error
  def assert_nothing_raised(&block)
    block.call
    assert true
  rescue => e
    flunk "Expected no error but got: #{e.class}: #{e.message}"
  end
  
  # Helper for testing floating point equality
  def assert_float_equal(expected, actual, delta = 0.0001)
    assert_in_delta expected, actual, delta
  end
end