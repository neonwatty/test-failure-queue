class User < ApplicationRecord
  has_secure_password
  
  has_many :posts, dependent: :destroy
  has_many :comments, dependent: :destroy
  
  validates :email, presence: true, 
                   uniqueness: { case_sensitive: false },
                   format: { with: URI::MailTo::EMAIL_REGEXP }
  
  validates :name, presence: true, length: { minimum: 2, maximum: 100 }
  
  validates :age, numericality: { greater_than_or_equal_to: 13, less_than: 120 }, 
                  allow_nil: true
  
  before_save :downcase_email
  
  scope :active, -> { where(active: true) }
  scope :adults, -> { where('age >= ?', 18) }
  scope :recent, -> { order(created_at: :desc) }
  
  def full_name
    "#{first_name} #{last_name}".strip
  end
  
  def adult?
    age.present? && age >= 18
  end
  
  def activate!
    update!(active: true, activated_at: Time.current)
  end
  
  def deactivate!
    update!(active: false, activated_at: nil)
  end
  
  private
  
  def downcase_email
    self.email = email.downcase if email.present?
  end
end