require "application_system_test_case"

class UsersTest < ApplicationSystemTestCase
  setup do
    @user = users(:one)
  end
  
  test "visiting the index" do
    visit users_url
    assert_selector "h1", text: "Users"
  end
  
  test "should create user" do
    visit users_url
    click_on "New user"
    
    fill_in "Email", with: "newsystem@example.com"
    fill_in "Name", with: "System Test User"
    fill_in "Age", with: 30
    fill_in "Password", with: "password123"
    fill_in "Password confirmation", with: "password123"
    click_on "Create User"
    
    assert_text "User was successfully created"
    assert_selector "h1", text: "System Test User"
  end
  
  test "should update User" do
    sign_in_as(@user)
    visit user_url(@user)
    click_on "Edit", match: :first
    
    fill_in "Name", with: "Updated System Name"
    fill_in "Email", with: @user.email
    click_on "Update User"
    
    assert_text "User was successfully updated"
    assert_selector "h1", text: "Updated System Name"
  end
  
  test "should destroy User" do
    sign_in_as(@user)
    visit user_url(@user)
    click_on "Destroy", match: :first
    
    assert_text "User was successfully destroyed"
  end
  
  test "should validate email format on frontend" do
    visit new_user_url
    
    fill_in "Email", with: "invalid-email"
    fill_in "Name", with: "Test User"
    fill_in "Password", with: "password123"
    fill_in "Password confirmation", with: "password123"
    
    assert_selector "input:invalid"
  end
  
  test "should show password strength indicator" do
    visit new_user_url
    
    fill_in "Password", with: "weak"
    assert_selector ".password-strength.weak"
    
    fill_in "Password", with: "StrongP@ssw0rd123!"
    assert_selector ".password-strength.strong"
  end
  
  test "FAILING: should have live search on users index" do
    visit users_url
    
    fill_in "search", with: @user.name
    
    assert_selector ".user-card", count: 1
    assert_text @user.name
    assert_no_text users(:two).name
  end
  
  test "should show user profile with recent activity" do
    visit user_url(@user)
    
    assert_selector ".profile-header"
    assert_selector ".recent-posts"
    assert_selector ".recent-comments"
    assert_text @user.name
    assert_text @user.email
  end
  
  test "should handle responsive navigation" do
    visit users_url
    
    resize_window_to("mobile")
    assert_selector ".mobile-menu-toggle"
    
    click_on class: "mobile-menu-toggle"
    assert_selector ".mobile-menu.active"
    
    resize_window_to("desktop")
    assert_no_selector ".mobile-menu-toggle"
  end
  
  test "FAILING: should auto-save draft when creating user" do
    visit new_user_url
    
    fill_in "Name", with: "Draft User"
    fill_in "Email", with: "draft@example.com"
    
    sleep 2
    
    visit new_user_url
    
    assert_field "Name", with: "Draft User"
    assert_field "Email", with: "draft@example.com"
  end
  
  test "should show loading state during form submission" do
    visit new_user_url
    
    fill_in "Email", with: "loading@example.com"
    fill_in "Name", with: "Loading Test"
    fill_in "Password", with: "password123"
    fill_in "Password confirmation", with: "password123"
    
    assert_no_selector ".spinner"
    
    click_on "Create User"
    
    assert_selector ".spinner"
  end
  
  test "should display flash messages with appropriate styling" do
    visit users_url
    sign_in_as(@user)
    
    visit edit_user_url(@user)
    fill_in "Name", with: ""
    click_on "Update User"
    
    assert_selector ".flash.alert-danger"
    assert_text "Please review the problems below"
  end
  
  test "FAILING: should have infinite scroll on users index" do
    50.times do |i|
      User.create!(
        name: "Scroll User #{i}",
        email: "scroll#{i}@example.com",
        password: "password123"
      )
    end
    
    visit users_url
    
    initial_count = all(".user-card").count
    
    scroll_to_bottom
    
    assert_selector ".user-card", minimum: initial_count + 10
    assert_no_selector ".pagination"
  end
  
  private
  
  def resize_window_to(size)
    case size
    when "mobile"
      page.driver.browser.manage.window.resize_to(375, 667)
    when "desktop"
      page.driver.browser.manage.window.resize_to(1920, 1080)
    end
  end
  
  def scroll_to_bottom
    page.execute_script "window.scrollTo(0, document.body.scrollHeight)"
  end
end