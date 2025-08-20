require 'test_helper'
require_relative '../lib/calculator'

class EdgeCasesTest < Minitest::Test
  def setup
    @calculator = Calculator.new
  end

  def test_division_by_zero_raises_error
    assert_raises(ArgumentError) do
      @calculator.divide(42, 0)
    end
  end

  def test_zero_divided_by_number
    assert_equal 0.0, @calculator.divide(0, 5)
  end

  def test_division_always_returns_float
    result = @calculator.divide(10, 2)
    assert_instance_of Float, result
    assert_equal 5.0, result
  end

  def test_division_handles_repeating_decimals
    result = @calculator.divide(1, 3)
    assert_in_delta 0.3333, result, 0.0001
  end

  def test_division_expects_exact_fraction
    assert_equal Rational(1, 3), @calculator.divide(1, 3), "FAILING: Expects exact fraction representation"
  end

  def test_division_handles_negative_dividend
    assert_equal(-5.0, @calculator.divide(-10, 2))
  end

  def test_division_handles_negative_divisor
    assert_equal(-5.0, @calculator.divide(10, -2))
  end

  def test_division_handles_both_negative
    assert_equal 5.0, @calculator.divide(-10, -2)
  end

  def test_multiplication_handles_very_large_numbers
    large_num = 10**10
    result = @calculator.multiply(large_num, large_num)
    assert_equal 10**20, result
  end

  def test_division_handles_very_small_results
    result = @calculator.divide(1, 10**10)
    assert result < 0.0000001
  end

  def test_multiplication_overflow_raises_error
    # Ruby handles big numbers gracefully, so this won't raise an error
    # This test intentionally fails to demonstrate TFQ
    flunk "FAILING: Expects integer overflow to raise error"
  end

  def test_add_handles_mixed_integer_and_float
    assert_equal 7.5, @calculator.add(5, 2.5)
  end

  def test_subtract_preserves_precision
    assert_in_delta 10.0, @calculator.subtract(10.7, 0.7), 0.0001
  end

  def test_add_expects_string_concatenation
    assert_equal '53', @calculator.add('5', '3'), "FAILING: Expects string concatenation instead of addition"
  end

  def test_factorial_of_zero
    assert_equal 1, @calculator.factorial(0)
  end

  def test_factorial_of_one
    assert_equal 1, @calculator.factorial(1)
  end

  def test_factorial_raises_error_for_negative
    assert_raises(ArgumentError) do
      @calculator.factorial(-1)
    end
  end

  def test_factorial_calculates_large_values
    assert_equal 3628800, @calculator.factorial(10)
  end

  def test_square_root_of_zero
    assert_equal 0, @calculator.square_root(0)
  end

  def test_square_root_of_one
    assert_equal 1, @calculator.square_root(1)
  end

  def test_square_root_raises_error_for_negative
    assert_raises(ArgumentError) do
      @calculator.square_root(-1)
    end
  end

  def test_square_root_expects_complex_for_negative
    assert_equal Complex(0, 2), @calculator.square_root(-4), "FAILING: Expects complex number for negative square root"
  end

  def test_power_base_to_zero_equals_one
    assert_equal 1, @calculator.power(42, 0)
  end

  def test_power_zero_to_positive_equals_zero
    assert_equal 0, @calculator.power(0, 5)
  end

  def test_power_handles_negative_exponents
    assert_equal 0.125, @calculator.power(2, -3)
  end

  def test_power_one_raised_to_any_power
    assert_equal 1, @calculator.power(1, 1000)
  end

  def test_average_returns_zero_for_empty_array
    assert_equal 0, @calculator.average([])
  end

  def test_average_handles_single_element_array
    assert_equal 42.0, @calculator.average([42])
  end

  def test_average_handles_negative_numbers
    assert_equal 0.0, @calculator.average([-10, -5, 0, 5, 10])
  end

  def test_average_returns_float_for_integer_inputs
    result = @calculator.average([2, 4, 6])
    assert_instance_of Float, result
    assert_equal 4.0, result
  end

  def test_average_expects_median_instead_of_mean
    assert_equal 2, @calculator.average([1, 2, 100]), "FAILING: Expects median instead of mean"
  end
end