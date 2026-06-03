data "azurerm_client_config" "current" {}

locals {
  backend_suffix = "${var.project_name}-${var.environment}"
  pg_sku         = var.environment == "prod" ? "GP_Standard_D2s_v3" : "B_Standard_B1ms"
  redis_sku      = var.environment == "prod" ? "Standard" : "Basic"
  kv_purge       = var.environment == "prod"
}

module "key_vault" {
  count  = var.enable_backend ? 1 : 0
  source = "./modules/data/key_vault"

  name                        = "kv-${local.backend_suffix}"
  location                    = var.location
  resource_group_name         = azurerm_resource_group.app.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  purge_protection_enabled    = local.kv_purge
  soft_delete_retention_days  = var.environment == "prod" ? 90 : 7
  tags                        = local.common_tags
}

module "postgresql" {
  count  = var.enable_backend ? 1 : 0
  source = "./modules/data/postgresql"

  name                          = "pg-${local.backend_suffix}"
  location                      = var.location
  resource_group_name           = azurerm_resource_group.app.name
  admin_password                = var.postgres_admin_password
  sku_name                      = local.pg_sku
  public_network_access_enabled = var.environment != "prod"
  tags                          = local.common_tags
}

module "storage" {
  count  = var.enable_backend ? 1 : 0
  source = "./modules/data/storage"

  name                 = replace("staether${var.environment}${substr(md5(var.project_name), 0, 8)}", "-", "")
  location             = var.location
  resource_group_name  = azurerm_resource_group.app.name
  media_retention_days = var.media_retention_days
  tags                 = local.common_tags
}

module "cosmos" {
  count  = var.enable_backend && var.enable_cosmos ? 1 : 0
  source = "./modules/data/cosmos"

  name                = "cosmos-${local.backend_suffix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  tags                = local.common_tags
}

module "redis" {
  count  = var.enable_backend && var.enable_redis ? 1 : 0
  source = "./modules/data/redis"

  name                = "redis-${local.backend_suffix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  sku_name            = local.redis_sku
  capacity            = var.environment == "prod" ? 1 : 0
  tags                = local.common_tags
}

module "service_bus" {
  count  = var.enable_backend ? 1 : 0
  source = "./modules/messaging/service_bus"

  namespace_name      = "sb-${local.backend_suffix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  sku                 = var.environment == "prod" ? "Standard" : "Basic"
  tags                = local.common_tags
}

module "signalr" {
  count  = var.enable_backend ? 1 : 0
  source = "./modules/compute/signalr"

  name                = "signalr-${local.backend_suffix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  sku_name            = var.environment == "prod" ? "Standard_S1" : "Free_F1"
  tags                = local.common_tags
}

module "container_app_api" {
  count  = var.enable_backend ? 1 : 0
  source = "./modules/compute/container_app_api"

  name                = "ca-api-${local.backend_suffix}"
  environment_name    = "cae-${local.backend_suffix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  container_image     = var.api_container_image
  min_replicas        = var.api_min_replicas
  max_replicas        = var.environment == "prod" ? 10 : 3
  tags                = local.common_tags

  env_vars = {
    NODE_ENV              = "production"
    DEV_AUTH_BYPASS       = "false"
    WORKER_PURGE_ONLY     = "true"
    CORS_ORIGIN           = "https://${azurerm_static_web_app.app.default_host_name}"
    MEDIA_CONTAINER       = module.storage[0].media_container_name
    SERVICE_BUS_DELETION_QUEUE = module.service_bus[0].deletion_queue_name
  }

  secret_env = {
    DATABASE_URL                     = azurerm_key_vault_secret.database_url[0].value
    JWT_SECRET                       = azurerm_key_vault_secret.jwt_secret[0].value
    AZURE_STORAGE_CONNECTION_STRING  = azurerm_key_vault_secret.storage_connection[0].value
    AZURE_SIGNALR_CONNECTION_STRING  = azurerm_key_vault_secret.signalr_connection[0].value
    SERVICE_BUS_CONNECTION_STRING    = azurerm_key_vault_secret.service_bus_connection[0].value
  }
}

module "function_workers" {
  count  = var.enable_backend ? 1 : 0
  source = "./modules/compute/function_workers"

  name                       = "func-${local.backend_suffix}"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.app.name
  storage_account_name       = module.storage[0].name
  storage_account_access_key = module.storage[0].primary_connection_string
  tags                       = local.common_tags
}
