data "azurerm_client_config" "current" {}

locals {
  backend_suffix = "${var.project_name}-${var.environment}"
  pg_sku         = var.environment == "prod" ? "GP_Standard_D2s_v3" : "B_Standard_B1ms"
  redis_sku      = var.environment == "prod" ? "Standard" : "Basic"
  kv_purge       = var.environment == "prod"
  use_kv_refs    = var.use_key_vault_secret_refs || var.environment != "dev"
  internal_ingress = var.enable_network_isolation && var.environment != "dev"
}

module "network" {
  count  = var.enable_backend && var.enable_network_isolation ? 1 : 0
  source = "./modules/network"

  name                = "vnet-${local.backend_suffix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.app.name
  enable_private_endpoints = var.environment != "dev"
  postgresql_server_id     = module.postgresql[0].server_id
  storage_account_id       = module.storage[0].id
  key_vault_id             = module.key_vault[0].id
  tags                     = local.common_tags
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
  public_network_access_enabled = var.environment == "dev" && !var.enable_network_isolation
  tags                          = local.common_tags
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "postgres_allow_azure" {
  count = var.enable_backend && var.postgres_allow_azure_services ? 1 : 0

  name             = "allow-azure-services"
  server_id        = module.postgresql[0].server_id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "postgres_allowed_ips" {
  for_each = var.enable_backend ? var.postgres_allowed_ip_addresses : {}

  name             = "allow-${replace(each.key, ".", "-")}"
  server_id        = module.postgresql[0].server_id
  start_ip_address = each.value
  end_ip_address   = each.value
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

resource "azurerm_key_vault_secret" "redis_url" {
  count        = var.enable_backend && var.enable_redis ? 1 : 0
  name         = "redis-url"
  value        = module.redis[0].primary_connection_string
  key_vault_id = module.key_vault[0].id
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

locals {
  api_env_vars = {
    NODE_ENV                   = "production"
    DEV_AUTH_BYPASS            = "false"
    WORKER_PURGE_ONLY          = "true"
    CORS_ORIGIN                = "https://${azurerm_static_web_app.app.default_host_name}"
    MEDIA_CONTAINER            = module.storage[0].media_container_name
    SERVICE_BUS_DELETION_QUEUE = module.service_bus[0].deletion_queue_name
  }

  api_kv_secret_refs = {
    database-url            = azurerm_key_vault_secret.database_url[0].id
    jwt-secret              = azurerm_key_vault_secret.jwt_secret[0].id
    admin-password          = azurerm_key_vault_secret.admin_password[0].id
    storage-connection-string = azurerm_key_vault_secret.storage_connection[0].id
    signalr-connection-string = azurerm_key_vault_secret.signalr_connection[0].id
    service-bus-connection-string = azurerm_key_vault_secret.service_bus_connection[0].id
  }

  api_kv_secret_env_map = merge(
    {
      DATABASE_URL                    = "database-url"
      JWT_SECRET                      = "jwt-secret"
      ADMIN_PASSWORD                  = "admin-password"
      AZURE_STORAGE_CONNECTION_STRING = "storage-connection-string"
      AZURE_SIGNALR_CONNECTION_STRING = "signalr-connection-string"
      SERVICE_BUS_CONNECTION_STRING   = "service-bus-connection-string"
    },
    var.enable_redis ? { REDIS_URL = "redis-url" } : {},
  )

  api_inline_secrets = merge(
    {
      DATABASE_URL                    = azurerm_key_vault_secret.database_url[0].value
      JWT_SECRET                      = azurerm_key_vault_secret.jwt_secret[0].value
      ADMIN_PASSWORD                  = azurerm_key_vault_secret.admin_password[0].value
      AZURE_STORAGE_CONNECTION_STRING = azurerm_key_vault_secret.storage_connection[0].value
      AZURE_SIGNALR_CONNECTION_STRING = azurerm_key_vault_secret.signalr_connection[0].value
      SERVICE_BUS_CONNECTION_STRING   = azurerm_key_vault_secret.service_bus_connection[0].value
    },
    var.enable_redis ? { REDIS_URL = module.redis[0].primary_connection_string } : {},
  )
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

  tenant_id                      = data.azurerm_client_config.current.tenant_id
  key_vault_id                   = module.key_vault[0].id
  acr_id                         = azurerm_container_registry.api[0].id
  acr_login_server               = azurerm_container_registry.api[0].login_server
  use_key_vault_refs             = local.use_kv_refs
  key_vault_secret_refs          = local.use_kv_refs ? merge(local.api_kv_secret_refs, var.enable_redis ? { redis-url = azurerm_key_vault_secret.redis_url[0].id } : {}) : {}
  key_vault_secret_env_map       = local.use_kv_refs ? local.api_kv_secret_env_map : {}
  secret_env                     = local.use_kv_refs ? {} : local.api_inline_secrets
  infrastructure_subnet_id       = var.enable_network_isolation ? module.network[0].container_apps_subnet_id : null
  internal_load_balancer_enabled = local.internal_ingress
  external_ingress               = !local.internal_ingress

  env_vars = local.api_env_vars
}

module "edge" {
  count  = var.enable_backend && var.enable_edge_waf ? 1 : 0
  source = "./modules/edge"

  name                = "afd-${local.backend_suffix}"
  resource_group_name = azurerm_resource_group.app.name
  location            = var.location
  backend_hostname    = module.container_app_api[0].fqdn
  custom_domains      = var.api_custom_domains
  enable_waf          = true
  enable_apim         = var.enable_apim
  tags                = local.common_tags
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
