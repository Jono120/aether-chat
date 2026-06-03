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
