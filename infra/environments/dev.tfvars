project_name        = "aether"
environment         = "dev"
location            = "newzealandnorth"
static_web_app_name = "aether-dev-001"
sku_tier            = "Free"
sku_size            = "Free"

tags = {
  cost_center = "demo"
}

# Requires: export TF_VAR_postgres_admin_password='...' (12+ chars) on terraform apply
enable_backend = true
enable_cosmos  = false
enable_redis   = false
postgres_allow_azure_services = false
# Restrict dev PG to team IPs — set before using real data:
# postgres_allowed_ip_addresses = { home = "203.0.113.10" }
