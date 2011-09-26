set :node_env, "staging"
set :branch, "master"
set :deploy_to, "/var/www/apps/#{application}/#{node_env}"
set :application_port, "1603"
