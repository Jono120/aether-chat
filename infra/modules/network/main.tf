variable "name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "address_space" {
  type    = list(string)
  default = ["10.50.0.0/16"]
}

variable "container_apps_subnet_prefix" {
  type    = string
  default = "10.50.0.0/23"
}

variable "private_endpoints_subnet_prefix" {
  type    = string
  default = "10.50.2.0/24"
}

variable "enable_private_endpoints" {
  type    = bool
  default = false
}

variable "postgresql_server_id" {
  type    = string
  default = null
}

variable "storage_account_id" {
  type    = string
  default = null
}

variable "key_vault_id" {
  type    = string
  default = null
}

variable "tags" {
  type    = map(string)
  default = {}
}

resource "azurerm_virtual_network" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = var.address_space
  tags                = var.tags
}

resource "azurerm_subnet" "container_apps" {
  name                 = "snet-container-apps"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [var.container_apps_subnet_prefix]

  delegation {
    name = "container-apps-delegation"
    service_delegation {
      name = "Microsoft.App/environments"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_subnet" "private_endpoints" {
  name                 = "snet-private-endpoints"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [var.private_endpoints_subnet_prefix]

  private_endpoint_network_policies = "Disabled"
}

resource "azurerm_private_endpoint" "postgresql" {
  count = var.enable_private_endpoints && var.postgresql_server_id != null ? 1 : 0

  name                = "${var.name}-pe-pg"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "postgresql"
    private_connection_resource_id = var.postgresql_server_id
    is_manual_connection           = false
    subresource_names              = ["postgresqlServer"]
  }
}

resource "azurerm_private_endpoint" "storage" {
  count = var.enable_private_endpoints && var.storage_account_id != null ? 1 : 0

  name                = "${var.name}-pe-storage"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "storage"
    private_connection_resource_id = var.storage_account_id
    is_manual_connection           = false
    subresource_names              = ["blob"]
  }
}

resource "azurerm_private_endpoint" "key_vault" {
  count = var.enable_private_endpoints && var.key_vault_id != null ? 1 : 0

  name                = "${var.name}-pe-kv"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "keyvault"
    private_connection_resource_id = var.key_vault_id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }
}
