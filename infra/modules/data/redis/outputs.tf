output "hostname" {
  value = azurerm_redis_cache.this.hostname
}

output "primary_connection_string" {
  value     = azurerm_redis_cache.this.primary_connection_string
  sensitive = true
}

output "id" {
  value = azurerm_redis_cache.this.id
}
