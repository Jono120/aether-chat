output "namespace_id" {
  value = azurerm_servicebus_namespace.this.id
}

output "deletion_queue_name" {
  value = azurerm_servicebus_queue.deletion.name
}

output "primary_connection_string" {
  value     = azurerm_servicebus_namespace.this.default_primary_connection_string
  sensitive = true
}
