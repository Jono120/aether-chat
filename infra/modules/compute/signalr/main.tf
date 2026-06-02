resource "azurerm_signalr_service" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku {
    name     = var.sku_name
    capacity = var.capacity
  }
  tags = var.tags

  cors {
    allowed_origins = ["*"]
  }

  connectivity_logs_enabled = true
  messaging_logs_enabled    = true
}
