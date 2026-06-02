resource "azurerm_servicebus_namespace" "this" {
  name                = var.namespace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku
  tags                = var.tags
}

resource "azurerm_servicebus_queue" "deletion" {
  name         = var.deletion_queue_name
  namespace_id = azurerm_servicebus_namespace.this.id

  dead_lettering_on_message_expiration = true
  max_delivery_count                   = 5
}
