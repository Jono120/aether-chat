project_name        = "aether"
environment         = "prod"
location            = "newzealandnorth"
static_web_app_name = "aether-prod-001"
sku_tier            = "Standard"
sku_size            = "Standard"

tags = {
  cost_center = "production"
}

enable_backend = true
enable_cosmos  = false
enable_redis   = true
use_key_vault_secret_refs = true
enable_network_isolation  = true
enable_edge_waf           = true
# postgres_admin_password — set via TF_VAR_postgres_admin_password in CI, never commit
api_min_replicas = 1
