require "test_helper"

class UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(name: "Test User", email: "test@example.com", age: 25)
  end

  test "should get index" do
    get users_url
    assert_response :success
  end

  test "should show user" do
    get user_url(@user)
    assert_response :success
  end

  test "should create user" do
    assert_difference("User.count") do
      post users_url, params: { 
        user: { 
          name: "New User",
          email: "new@example.com",
          age: 30
        } 
      }, as: :json
    end
    assert_response :created
  end

  test "should not create user with invalid params" do
    assert_no_difference("User.count") do
      post users_url, params: { 
        user: { 
          name: "",
          email: "",
          age: 10
        } 
      }, as: :json
    end
    assert_response :unprocessable_entity
  end

end