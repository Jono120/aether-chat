variable "name" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "backend_hostname" {
  description = "Container Apps API FQDN or custom hostname for the origin."
  type        = string
}

variable "custom_domains" {
  type    = list(string)
  default = []
}

variable "enable_waf" {
  type    = bool
  default = false
}

variable "enable_apim" {
  type    = bool
  default = false
}

variable "apim_sku" {
  type    = string
  default = "Developer_1"
}

variable "tags" {
  type    = map(string)
  default = {}
}

resource "azurerm_cdn_frontdoor_profile" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  sku_name            = "Premium_AzureFrontDoor"
  tags                = var.tags
}

resource "azurerm_cdn_frontdoor_endpoint" "api" {
  name                     = "${var.name}-endpoint"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id
}

resource "azurerm_cdn_frontdoor_origin_group" "api" {
  name                     = "${var.name}-origins"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }

  health_probe {
    path                = "/health/live"
    protocol            = "Https"
    request_type        = "GET"
    interval_in_seconds = 30
  }
}

resource "azurerm_cdn_frontdoor_origin" "api" {
  name                           = "${var.name}-ca-origin"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.api.id
  enabled                        = true
  host_name                      = var.backend_hostname
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = var.backend_hostname
  priority                       = 1
  weight                         = 1000
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_route" "api" {
  name                          = "${var.name}-route"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.api.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.api.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.api.id]
  enabled                       = true

  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]
  link_to_default_domain = true
}

resource "azurerm_cdn_frontdoor_firewall_policy" "waf" {
  count = var.enable_waf ? 1 : 0

  name                = replace("${var.name}waf", "-", "")
  resource_group_name = var.resource_group_name
  sku_name            = "Premium_AzureFrontDoor"
  enabled             = true
  mode                = "Prevention"

  managed_rule {
    type    = "Microsoft_DefaultRuleSet"
    version = "2.1"
    action  = "Block"
  }

  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }
}

resource "azurerm_cdn_frontdoor_security_policy" "waf" {
  count = var.enable_waf ? 1 : 0

  name                     = "${var.name}-waf-policy"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.waf[0].id

      association {
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.api.id
        }
        patterns_to_match = ["/*"]
      }
    }
  }
}

resource "azurerm_api_management" "this" {
  count = var.enable_apim ? 1 : 0

  name                = "${var.name}-apim"
  location            = var.location
  resource_group_name = var.resource_group_name
  publisher_name      = "Aether"
  publisher_email     = "ops@aether.local"
  sku_name            = var.apim_sku
  tags                = var.tags
}

resource "azurerm_api_management_backend" "api" {
  count = var.enable_apim ? 1 : 0

  name                = "aether-api"
  resource_group_name = var.resource_group_name
  api_management_name = azurerm_api_management.this[0].name
  protocol            = "http"
  url                 = "https://${var.backend_hostname}"
}
