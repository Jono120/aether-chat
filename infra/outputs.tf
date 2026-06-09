output "resource_group_name" {
  description = "Name of the application resource group."
  value       = azurerm_resource_group.app.name
}

output "static_web_app_default_hostname" {
  description = "Default hostname for the Static Web App."
  value       = azurerm_static_web_app.app.default_host_name
}

output "static_web_app_api_key" {
  description = "Deployment token for Azure/static-web-apps-deploy (store as AZURE_STATIC_WEB_APPS_API_TOKEN)."
  value       = azurerm_static_web_app.app.api_key
  sensitive   = true
}

output "static_web_app_id" {
  description = "Azure resource ID of the Static Web App."
  value       = azurerm_static_web_app.app.id
}

output "api_fqdn" {
  description = "FQDN of the Container Apps API (when enable_backend = true)."
  value       = var.enable_backend ? module.container_app_api[0].fqdn : null
}

output "postgresql_fqdn" {
  description = "PostgreSQL server FQDN (when enable_backend = true)."
  value       = var.enable_backend ? module.postgresql[0].fqdn : null
}

output "key_vault_uri" {
  description = "Key Vault URI for secrets (when enable_backend = true)."
  value       = var.enable_backend ? module.key_vault[0].vault_uri : null
}

output "signalr_hostname" {
  description = "Azure SignalR hostname (when enable_backend = true)."
  value       = var.enable_backend ? module.signalr[0].hostname : null
}

output "storage_account_name" {
  description = "Media storage account name (when enable_backend = true)."
  value       = var.enable_backend ? module.storage[0].name : null
}

output "api_url" {
  description = "HTTPS base URL for the API (set as VITE_API_URL in SPA build)."
  value       = var.enable_backend ? (
    var.enable_edge_waf ? "https://${module.edge[0].front_door_endpoint_hostname}" : "https://${module.container_app_api[0].fqdn}"
  ) : null
}

output "front_door_hostname" {
  description = "Azure Front Door endpoint hostname when WAF edge is enabled."
  value       = var.enable_backend && var.enable_edge_waf ? module.edge[0].front_door_endpoint_hostname : null
}

output "container_registry_login_server" {
  description = "ACR login server for API image push (when enable_backend = true)."
  value       = var.enable_backend ? azurerm_container_registry.api[0].login_server : null
}

output "static_web_app_url" {
  description = "HTTPS URL for the hosted SPA (CORS origin for API)."
  value       = "https://${azurerm_static_web_app.app.default_host_name}"
}
