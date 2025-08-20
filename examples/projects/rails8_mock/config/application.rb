require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_view/railtie"
require "rails/test_unit/railtie"

Bundler.require(*Rails.groups)

module Rails8Example
  class Application < Rails::Application
    config.load_defaults 8.0
    
    config.autoload_lib(ignore: %w[assets tasks])
    
    config.api_only = false
    
    config.time_zone = "UTC"
    
    config.active_record.encryption.support_unencrypted_data = true
    
    config.active_support.to_time_preserves_timezone = :zone
  end
end