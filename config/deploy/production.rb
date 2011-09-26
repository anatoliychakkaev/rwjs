set :node_env, "production"
set :branch, "master"
set :deploy_to, "/var/www/apps/#{application}/#{node_env}"
set :application_port, "8808"
