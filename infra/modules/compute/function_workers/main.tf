resource "azurerm_service_plan" "workers" {
  name                = "${var.name}-plan"
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = var.service_plan_sku
  tags                = var.tags
}

resource "azurerm_linux_function_app" "workers" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  service_plan_id     = azurerm_service_plan.workers.id
  tags                = var.tags

  storage_account_name       = var.storage_account_name
  storage_account_access_key = var.storage_account_access_key

  site_config {
    application_stack {
      node_version = "20"
    }
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "node"
  }
}
