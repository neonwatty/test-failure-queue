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

  # FAILING TESTS - Intentional failures to demonstrate tfq

  test "FAILING: should return paginated results" do
    get users_url
    assert_response :success
    json = JSON.parse(response.body)
    assert json["pagination"], "Expected pagination metadata in response"
  end

  test "FAILING: should handle user not found gracefully" do
    get user_url(id: 999999)
    assert_response :not_found
  end

  test "FAILING: should filter users by age" do
    get users_url, params: { age: 18 }
    assert_response :success
    json = JSON.parse(response.body)
    assert json.all? { |user| user["age"] >= 18 }, "Expected only adult users"
  end
end