class User < ApplicationRecord
  validates :name, presence: true, length: { minimum: 2 }
  validates :email, presence: true, uniqueness: { case_sensitive: false }
  validates :age, numericality: { greater_than_or_equal_to: 13 }, allow_nil: true

  def adult?
    return false if age.nil?
    age >= 18
  end
end
