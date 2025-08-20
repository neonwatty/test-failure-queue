require 'test_helper'
require_relative '../lib/calculator'

class CalculatorTest < Minitest::Test
  def setup
    @calculator = Calculator.new
  end

  def test_add_returns_sum_of_two_numbers
    assert_equal 5, @calculator.add(2, 3)
  end

  def test_add_handles_large_numbers
    assert_equal 3000, @calculator.add(1000, 2000)
  end

  def test_add_correctly_adds_negative_values
    assert_equal(-8, @calculator.add(-5, -3))
  end

  def test_subtract_returns_difference_of_two_numbers
    assert_equal 6, @calculator.subtract(10, 4)
  end

  def test_subtract_handles_negative_results
    assert_equal(-2, @calculator.subtract(3, 5))
  end

  def test_subtract_correctly
    assert_equal 50, @calculator.subtract(100, 50)
  end

  def test_multiply_returns_product_of_two_numbers
    assert_equal 20, @calculator.multiply(4, 5)
  end

  def test_multiply_handles_multiplication_by_zero
    assert_equal 0, @calculator.multiply(100, 0)
  end

  def test_multiply_negative_numbers_correctly
    assert_equal(-12, @calculator.multiply(-3, 4))
  end

  def test_divide_returns_quotient_of_two_numbers
    assert_equal 5.0, @calculator.divide(10, 2)
  end

  def test_divide_handles_division_resulting_in_float
    assert_equal 3.5, @calculator.divide(7, 2)
  end

  def test_divide_raises_error_for_division_by_zero
    error = assert_raises(ArgumentError) do
      @calculator.divide(10, 0)
    end
    assert_equal 'Cannot divide by zero', error.message
  end

  def test_divide_returns_float
    assert_in_delta 3.333, @calculator.divide(10, 3), 0.01
  end

  def test_power_calculates_exponentiation_correctly
    assert_equal 8, @calculator.power(2, 3)
  end

  def test_power_handles_power_of_zero
    assert_equal 1, @calculator.power(5, 0)
  end

  def test_power_handles_negative_exponents
    assert_equal 0.25, @calculator.power(2, -2)
  end

  def test_square_root_calculates_correctly
    assert_equal 4, @calculator.square_root(16)
  end

  def test_square_root_handles_non_perfect_squares
    assert_in_delta 1.414, @calculator.square_root(2), 0.001
  end

  def test_square_root_raises_error_for_negative_input
    error = assert_raises(ArgumentError) do
      @calculator.square_root(-4)
    end
    assert_equal 'Cannot calculate square root of negative number', error.message
  end

  def test_factorial_calculates_correctly
    assert_equal 120, @calculator.factorial(5)
  end

  def test_factorial_returns_one_for_zero
    assert_equal 1, @calculator.factorial(0)
  end

  def test_factorial_raises_error_for_negative_input
    error = assert_raises(ArgumentError) do
      @calculator.factorial(-5)
    end
    assert_equal 'Factorial is not defined for negative numbers', error.message
  end

  def test_average_calculates_for_array_of_numbers
    assert_equal 3.0, @calculator.average([1, 2, 3, 4, 5])
  end

  def test_average_handles_empty_array
    assert_equal 0, @calculator.average([])
  end

  def test_average_handles_single_element
    assert_equal 42.0, @calculator.average([42])
  end
end