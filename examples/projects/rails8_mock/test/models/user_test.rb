require "test_helper"

class UserTest < ActiveSupport::TestCase
  def setup
    @user = User.new(
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      password_confirmation: "password123",
      age: 25
    )
  end
  
  test "should be valid with valid attributes" do
    assert @user.valid?
  end
  
  test "name should be present" do
    @user.name = "   "
    assert_not @user.valid?
    assert_errors_on @user, :name
  end
  
  test "email should be present" do
    @user.email = ""
    assert_not @user.valid?
  end
  
  test "email should be unique" do
    duplicate_user = @user.dup
    duplicate_user.email = @user.email.upcase
    @user.save
    assert_not duplicate_user.valid?
  end
  
  test "email should be saved as lowercase" do
    mixed_case_email = "JoHn@ExAmPle.CoM"
    @user.email = mixed_case_email
    @user.save
    assert_equal mixed_case_email.downcase, @user.reload.email
  end
  
  test "email validation should accept valid addresses" do
    valid_addresses = %w[user@example.com USER@foo.COM A_US-ER@foo.bar.org
                        first.last@foo.jp alice+bob@baz.cn]
    valid_addresses.each do |valid_address|
      @user.email = valid_address
      assert @user.valid?, "#{valid_address.inspect} should be valid"
    end
  end
  
  test "email validation should reject invalid addresses" do
    invalid_addresses = %w[user@example,com user_at_foo.org user.name@example.
                          foo@bar_baz.com foo@bar+baz.com]
    invalid_addresses.each do |invalid_address|
      @user.email = invalid_address
      assert_not @user.valid?, "#{invalid_address.inspect} should be invalid"
    end
  end
  
  test "password should have minimum length" do
    @user.password = @user.password_confirmation = "a" * 5
    assert_not @user.valid?
  end
  
  test "age should be numeric" do
    @user.age = "twenty"
    assert_not @user.valid?
    assert_errors_on @user, :age
  end
  
  test "FAILING: age should be at least 13" do
    @user.age = 12
    assert @user.valid?, "Expected age 12 to be valid (but minimum is 13)"
    assert_no_errors_on @user, :age
  end
  
  test "age can be nil" do
    @user.age = nil
    assert @user.valid?
  end
  
  test "full_name should combine first and last name" do
    @user.first_name = "John"
    @user.last_name = "Doe"
    assert_equal "John Doe", @user.full_name
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
  
  test "FAILING: adult? should incorrectly return true for nil age" do
    @user.age = nil
    assert @user.adult?, "Expected adult? to return true for nil age (incorrect expectation)"
  end
  
  test "activate! should set active to true and set activated_at" do
    @user.save
    @user.activate!
    assert @user.active?
    assert_not_nil @user.activated_at
  end
  
  test "deactivate! should set active to false and clear activated_at" do
    @user.save
    @user.activate!
    @user.deactivate!
    assert_not @user.active?
    assert_nil @user.activated_at
  end
  
  test "FAILING: name should allow single character (incorrect validation)" do
    @user.name = "A"
    assert @user.valid?, "Expected single character name to be valid (but minimum is 2)"
  end
  
  test "active scope should return only active users" do
    @user.save
    @user.activate!
    inactive_user = User.create!(
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      active: false
    )
    
    active_users = User.active
    assert_includes active_users, @user
    assert_not_includes active_users, inactive_user
  end
  
  test "adults scope should return users 18 or older" do
    @user.age = 25
    @user.save
    
    minor = User.create!(
      name: "Teen User",
      email: "teen@example.com",
      password: "password123",
      age: 16
    )
    
    adults = User.adults
    assert_includes adults, @user
    assert_not_includes adults, minor
  end
  
  test "FAILING: email should be case sensitive (incorrect expectation)" do
    user1 = User.create!(
      name: "User One",
      email: "test@example.com",
      password: "password123"
    )
    
    user2 = User.new(
      name: "User Two",
      email: "TEST@EXAMPLE.COM",
      password: "password123"
    )
    
    assert user2.valid?, "Expected email uniqueness to be case sensitive (but it's not)"
  end
  
  test "user should have many posts" do
    assert_respond_to @user, :posts
  end
  
  test "user should have many comments" do
    assert_respond_to @user, :comments
  end
  
  test "destroying user should destroy associated posts" do
    @user.save
    @user.posts.create!(title: "Test Post", content: "Content")
    assert_difference 'Post.count', -1 do
      @user.destroy
    end
  end
end