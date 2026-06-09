project_name        = "aether"
environment         = "staging"
location            = "newzealandnorth"
static_web_app_name = "aether-staging-001"
sku_tier            = "Standard"
sku_size            = "Standard"

tags = {
  cost_center = "staging"
}

enable_backend              = true
enable_cosmos               = false
enable_redis                = true
enable_network_isolation    = true
use_key_vault_secret_refs   = true
enable_edge_waf             = false
postgres_allow_azure_services = false
# postgres_allowed_ip_addresses = { team = "203.0.113.10" }
api_min_replicas = 1
