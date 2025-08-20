require "test_helper"

class UserTest < ActiveSupport::TestCase
  def setup
    @user = User.new(name: "John Doe", email: "john@example.com", age: 25)
  end

  test "should be valid with valid attributes" do
    assert @user.valid?
  end

  test "name should be present" do
    @user.name = "   "
    assert_not @user.valid?
  end

  test "email should be present" do
    @user.email = ""
    assert_not @user.valid?
  end

  test "email should be unique" do
    @user.save
    duplicate_user = @user.dup
    duplicate_user.email = @user.email.upcase
    assert_not duplicate_user.valid?
  end

  test "adult? should return true for users 18 or older" do
    @user.age = 18
    assert @user.adult?
    
    @user.age = 25
    assert @user.adult?
  end

  test "adult? should return false for users under 18" do
    @user.age = 17
    assert_not @user.adult?
  end

  # FAILING TESTS - Intentional failures to demonstrate tfq

  test "FAILING: adult? should incorrectly return true for nil age" do
    @user.age = nil
    assert @user.adult?, "Expected adult? to return true for nil age (incorrect expectation)"
  end

  test "FAILING: name should allow single character" do
    @user.name = "A"
    assert @user.valid?, "Expected single character name to be valid (but minimum is 2)"
  end

  test "FAILING: age should be at least 13" do
    @user.age = 12
    assert @user.valid?, "Expected age 12 to be valid (but minimum is 13)"
  end

  test "FAILING: email should be case sensitive" do
    @user.save
    duplicate_user = User.new(name: "Jane Doe", email: @user.email.upcase, age: 20)
    assert duplicate_user.valid?, "Expected email uniqueness to be case sensitive (but it's not)"
  end
end