class UsersController < ApplicationController
  before_action :set_user, only: %i[show edit update destroy]
  before_action :authenticate_user!, except: %i[index show new create]
  
  def index
    @users = User.active.page(params[:page])
  end
  
  def show
    @posts = @user.posts.recent.limit(5)
  end
  
  def new
    @user = User.new
  end
  
  def edit
    authorize! @user
  end
  
  def create
    @user = User.new(user_params)
    
    if @user.save
      UserMailer.welcome(@user).deliver_later
      redirect_to @user, notice: 'User was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end
  
  def update
    authorize! @user
    
    if @user.update(user_params)
      redirect_to @user, notice: 'User was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end
  
  def destroy
    authorize! @user
    @user.destroy!
    redirect_to users_url, notice: 'User was successfully destroyed.'
  end
  
  private
  
  def set_user
    @user = User.find(params[:id])
  end
  
  def user_params
    params.require(:user).permit(:name, :email, :age, :password, :password_confirmation)
  end
  
  def authorize!(user)
    redirect_to root_path, alert: 'Not authorized' unless can_edit?(user)
  end
  
  def can_edit?(user)
    current_user == user || current_user&.admin?
  end
end