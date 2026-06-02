output "endpoint" {
  value = azurerm_cosmosdb_account.this.endpoint
}

output "id" {
  value = azurerm_cosmosdb_account.this.id
}

output "primary_key" {
  value     = azurerm_cosmosdb_account.this.primary_key
  sensitive = true
}
