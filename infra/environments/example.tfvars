# Copy to dev.tfvars or prod.tfvars and replace placeholder values.
# All keys map to variables in ../variables.tf — no project-specific names in .tf files.

project_name        = "myapp"
environment         = "dev"
location            = "newzealandnorth"
static_web_app_name = "myapp-dev-001"
sku_tier            = "Free"
sku_size            = "Free"

tags = {
  cost_center = "engineering"
}

# Backend platform (optional)
enable_backend           = false
enable_cosmos            = false
enable_redis             = false
# postgres_admin_password = "change-me-min-12-chars"
# api_container_image     = "myregistry.azurecr.io/aether-api:latest"
