require 'capistrano/ext/multistage'
set :stages, %w[production]
set :default_stage, 'production'

set :application, "railwayjs.com"
set :node_file, "server.js"
set :host, "node-js.ru"
set :repository, "git@github.com:anatoliychakkaev/rwjs.git"

set :scm, :git
set :deploy_via, :remote_cache
role :app, host
set :user, "anatoliy"
set :use_sudo, true
set :admin_runner, 'anatoliy'
#default_run_options[:pty] = true

namespace :deploy do
  task :start, :roles => :app, :except => { :no_release => true } do
    run "sudo start #{application}-#{node_env}"
  end

  task :content, :roles => :app, :except => { :no_release => true } do
    run "cd #{current_path}/wiki && git pull origin master && cd ../ && node generate"
  end

  task :stop, :roles => :app, :except => { :no_release => true } do
    run "sudo stop #{application}-#{node_env}"
  end

  task :restart, :roles => :app, :except => { :no_release => true } do
    run "sudo restart #{application}-#{node_env} || sudo start #{application}-#{node_env}"
  end

  desc "Symlink config files"
  task :symlink_configs, :roles => :app do
    %w[app_config.yml twitter.yml mailer.yml].each do |f|
      run "ln -sf #{shared_path}/config/#{f} #{release_path}/config/#{f}"
    end
  end

  desc "Check required packages and install if packages are not installed"
  task :check_packages, roles => :app do
    run "cd #{release_path} && jake depends"
  end

  task :create_deploy_to_with_sudo, :roles => :app do
    run "sudo mkdir -p #{deploy_to}"
    run "sudo chown #{admin_runner}:#{admin_runner} #{deploy_to}"
  end

  task :write_upstart_script, :roles => :app do
    upstart_script = <<-UPSTART
  description "#{application}"

  start on startup
  stop on shutdown

  script
      # We found $HOME is needed. Without it, we ran into problems
      export HOME="/home/#{admin_runner}"
      export NODE_ENV="#{node_env}"

      cd #{current_path}
      exec sudo -u #{admin_runner} sh -c "NODE_ENV=#{node_env} /usr/local/bin/node #{current_path}/#{node_file} #{application_port} >> #{shared_path}/log/#{node_env}.log 2>&1"
  end script
  respawn
UPSTART
  put upstart_script, "/tmp/#{application}-upstart.conf"
    run "sudo mv /tmp/#{application}-upstart.conf /etc/init/#{application}-#{node_env}.conf"
  end

  desc "Update submodules"
  task :update_submodules, :roles => :app do
    run "cd #{release_path}; git submodule init && git submodule update"
  end

  task :create_deploy_to_with_sudo, :roles => :app do
    run "sudo mkdir -p #{deploy_to}"
    run "sudo chown #{admin_runner}:#{admin_runner} #{deploy_to}"
  end

end

before 'deploy:setup', 'deploy:create_deploy_to_with_sudo'
after 'deploy:setup', 'deploy:write_upstart_script'
after "deploy:finalize_update", "deploy:cleanup", "deploy:update_submodules", "deploy:symlink_configs"#, "deploy:check_packages"
