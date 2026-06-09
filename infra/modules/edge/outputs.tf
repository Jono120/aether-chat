output "front_door_endpoint_hostname" {
  value = azurerm_cdn_frontdoor_endpoint.api.host_name
}

output "front_door_profile_id" {
  value = azurerm_cdn_frontdoor_profile.this.id
}

output "apim_gateway_url" {
  value = var.enable_apim ? azurerm_api_management.this[0].gateway_url : null
}
