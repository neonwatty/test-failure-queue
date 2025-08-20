require "test_helper"

class UsersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @admin = users(:admin)
    @other_user = users(:two)
  end
  
  test "should get index" do
    get users_url
    assert_response :success
  end
  
  test "should get new" do
    get new_user_url
    assert_response :success
  end
  
  test "should create user" do
    assert_difference("User.count") do
      post users_url, params: { 
        user: { 
          email: "newuser@example.com",
          name: "New User",
          password: "password123",
          password_confirmation: "password123",
          age: 25
        } 
      }
    end
    
    assert_redirected_to user_url(User.last)
  end
  
  test "should not create user with invalid params" do
    assert_no_difference("User.count") do
      post users_url, params: { 
        user: { 
          email: "",
          name: "",
          password: "short",
          password_confirmation: "different"
        } 
      }
    end
    
    assert_response :unprocessable_entity
  end
  
  test "FAILING: should show user profile with avatar" do
    get user_url(@user)
    assert_response :success
    assert_select "img.user-avatar", 1, "Expected user avatar image to be displayed"
  end
  
  test "should get edit when logged in as same user" do
    sign_in_as(@user)
    get edit_user_url(@user)
    assert_response :success
  end
  
  test "should redirect edit when not logged in" do
    get edit_user_url(@user)
    assert_redirected_to login_url
  end
  
  test "should redirect edit when logged in as different user" do
    sign_in_as(@other_user)
    get edit_user_url(@user)
    assert_redirected_to root_path
  end
  
  test "should allow admin to edit any user" do
    sign_in_as(@admin)
    get edit_user_url(@user)
    assert_response :success
  end
  
  test "should update user when logged in as same user" do
    sign_in_as(@user)
    patch user_url(@user), params: { 
      user: { 
        name: "Updated Name",
        email: @user.email
      } 
    }
    assert_redirected_to user_url(@user)
    @user.reload
    assert_equal "Updated Name", @user.name
  end
  
  test "should not update user with invalid params" do
    sign_in_as(@user)
    patch user_url(@user), params: { 
      user: { 
        name: "",
        email: "invalid"
      } 
    }
    assert_response :unprocessable_entity
  end
  
  test "should destroy user when logged in as same user" do
    sign_in_as(@user)
    assert_difference("User.count", -1) do
      delete user_url(@user)
    end
    
    assert_redirected_to users_url
  end
  
  test "should not destroy user when not logged in" do
    assert_no_difference("User.count") do
      delete user_url(@user)
    end
    
    assert_redirected_to login_url
  end
  
  test "FAILING: should return JSON for index with json format" do
    get users_url, as: :json
    assert_response :success
    json = JSON.parse(response.body)
    assert_kind_of Array, json
    assert json.length > 0, "Expected JSON array with users"
  end
  
  test "should send welcome email after user creation" do
    assert_emails 1 do
      post users_url, params: { 
        user: { 
          email: "welcome@example.com",
          name: "Welcome User",
          password: "password123",
          password_confirmation: "password123"
        } 
      }
    end
  end
  
  test "FAILING: should paginate users on index" do
    51.times do |i|
      User.create!(
        name: "User #{i}",
        email: "user#{i}@example.com",
        password: "password123"
      )
    end
    
    get users_url
    assert_select "nav.pagination", 1, "Expected pagination controls"
  end
  
  test "should show recent posts on user show page" do
    5.times do |i|
      @user.posts.create!(
        title: "Post #{i}",
        content: "Content #{i}",
        created_at: i.days.ago
      )
    end
    
    get user_url(@user)
    assert_select ".recent-posts .post", 5
  end
  
  test "should filter only active users on index" do
    @user.deactivate!
    get users_url
    assert_response :success
    assert_not response.body.include?(@user.name)
  end
  
  test "FAILING: should handle user not found gracefully" do
    get user_url(id: 'nonexistent')
    assert_response :not_found
    assert_equal "User not found", flash[:alert]
  end
  
  test "should require strong parameters" do
    sign_in_as(@user)
    assert_raises(ActionController::ParameterMissing) do
      patch user_url(@user), params: { 
        admin: true,
        hacker_field: "malicious"
      }
    end
  end
end