output "fqdn" {
  value = azurerm_container_app.api.ingress[0].fqdn
}

output "id" {
  value = azurerm_container_app.api.id
}

output "latest_revision_name" {
  value = azurerm_container_app.api.latest_revision_name
}
