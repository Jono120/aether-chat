resource "random_password" "jwt_secret" {
  count   = var.enable_backend ? 1 : 0
  length  = 48
  special = false
}

# Local administrator password: generated per environment, stored only in Key Vault
resource "random_password" "admin_password" {
  count   = var.enable_backend ? 1 : 0
  length  = 32
  special = false
}

resource "azurerm_key_vault_secret" "admin_password" {
  count        = var.enable_backend ? 1 : 0
  name         = "admin-password"
  value        = random_password.admin_password[0].result
  key_vault_id = module.key_vault[0].id
}

resource "azurerm_key_vault_secret" "database_url" {
  count        = var.enable_backend ? 1 : 0
  name         = "database-url"
  value        = "postgresql://${module.postgresql[0].admin_login}:${var.postgres_admin_password}@${module.postgresql[0].fqdn}:5432/${module.postgresql[0].database_name}?sslmode=require"
  key_vault_id = module.key_vault[0].id
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  count        = var.enable_backend ? 1 : 0
  name         = "jwt-secret"
  value        = random_password.jwt_secret[0].result
  key_vault_id = module.key_vault[0].id
}

resource "azurerm_key_vault_secret" "storage_connection" {
  count        = var.enable_backend ? 1 : 0
  name         = "storage-connection-string"
  value        = module.storage[0].primary_connection_string
  key_vault_id = module.key_vault[0].id
}

resource "azurerm_key_vault_secret" "signalr_connection" {
  count        = var.enable_backend ? 1 : 0
  name         = "signalr-connection-string"
  value        = module.signalr[0].primary_connection_string
  key_vault_id = module.key_vault[0].id
}

resource "azurerm_key_vault_secret" "service_bus_connection" {
  count        = var.enable_backend ? 1 : 0
  name         = "service-bus-connection-string"
  value        = module.service_bus[0].primary_connection_string
  key_vault_id = module.key_vault[0].id
}

resource "azurerm_container_registry" "api" {
  count               = var.enable_backend ? 1 : 0
  name                = replace("acraether${var.environment}${substr(md5(var.project_name), 0, 6)}", "-", "")
  resource_group_name = azurerm_resource_group.app.name
  location            = var.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.common_tags
}
