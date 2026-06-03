output "server_id" {
  value = azurerm_postgresql_flexible_server.this.id
}

output "fqdn" {
  value = azurerm_postgresql_flexible_server.this.fqdn
}

output "admin_login" {
  value = azurerm_postgresql_flexible_server.this.administrator_login
}

output "database_name" {
  value = azurerm_postgresql_flexible_server_database.app.name
}

output "connection_string_hint" {
  description = "Construct DATABASE_URL in Key Vault; not outputting password."
  value       = "postgresql://${azurerm_postgresql_flexible_server.this.administrator_login}@${azurerm_postgresql_flexible_server.this.fqdn}:5432/${azurerm_postgresql_flexible_server_database.app.name}?sslmode=require"
  sensitive   = true
}
