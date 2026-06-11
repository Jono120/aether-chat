variable "project_name" {
  description = "Short project identifier used in resource names and tags."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{2,20}$", var.project_name))
    error_message = "project_name must be 2–20 lowercase alphanumeric characters or hyphens."
  }
}

variable "environment" {
  description = "Deployment environment (e.g. dev, prod)."
  type        = string

  validation {
    condition     = contains(["dev", "prod", "staging", "test"], var.environment)
    error_message = "environment must be one of: dev, prod, staging, test."
  }
}

variable "location" {
  description = "Azure region for resources (must support Static Web Apps)."
  type        = string
}

variable "static_web_app_name" {
  description = "Globally unique name for the Static Web App."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{2,60}$", var.static_web_app_name))
    error_message = "static_web_app_name must be 2–60 lowercase alphanumeric characters or hyphens."
  }
}

variable "sku_tier" {
  description = "Static Web App SKU tier (Free or Standard)."
  type        = string
  default     = "Free"
}

variable "sku_size" {
  description = "Static Web App SKU size (Free or Standard)."
  type        = string
  default     = "Free"
}

variable "tags" {
  description = "Additional tags merged onto all resources."
  type        = map(string)
  default     = {}
}

# --- Backend platform (optional; SWA always provisioned) ---

variable "enable_backend" {
  description = "Provision API, data plane, messaging, and workers."
  type        = bool
  default     = false
}

variable "enable_cosmos" {
  description = "Provision Cosmos DB for messages (optional scale path)."
  type        = bool
  default     = false
}

variable "enable_redis" {
  description = "Provision Azure Cache for Redis (presence / SignalR backplane)."
  type        = bool
  default     = false
}

variable "postgres_admin_password" {
  description = "PostgreSQL administrator password (required when enable_backend = true)."
  type        = string
  sensitive   = true
  default     = null

  validation {
    condition     = var.enable_backend == false || (var.postgres_admin_password != null && length(var.postgres_admin_password) >= 12)
    error_message = "When enable_backend is true, postgres_admin_password must be at least 12 characters."
  }
}

variable "api_container_image" {
  description = "Container image for the Aether API (Container Apps)."
  type        = string
  default     = "mcr.microsoft.com/k8se/quickstart:latest"
}

variable "api_min_replicas" {
  description = "Minimum replicas for the API Container App."
  type        = number
  default     = 0
}

variable "media_retention_days" {
  description = "Blob lifecycle retention for album media."
  type        = number
  default     = 7
}

variable "enable_network_isolation" {
  description = "Provision VNet, private endpoints, and VNet-integrated Container Apps."
  type        = bool
  default     = false
}

variable "enable_edge_waf" {
  description = "Provision Azure Front Door Premium with WAF in front of the API."
  type        = bool
  default     = false
}

variable "enable_apim" {
  description = "Optional API Management instance for throttling and versioning."
  type        = bool
  default     = false
}

variable "api_custom_domains" {
  description = "Custom domain names for Front Door (prod)."
  type        = list(string)
  default     = []
}

variable "use_key_vault_secret_refs" {
  description = "Container Apps pull secrets via managed identity + Key Vault references (recommended staging/prod)."
  type        = bool
  default     = false
}

variable "postgres_allowed_ip_addresses" {
  description = "Explicit IP allowlist for PostgreSQL firewall (dev). Empty disables team IP rules."
  type        = map(string)
  default     = {}
}

variable "postgres_allow_azure_services" {
  description = "Allow Azure services PostgreSQL firewall rule (0.0.0.0 — any Azure-hosted IP). Off by default; prefer postgres_allowed_ip_addresses or network isolation."
  type        = bool
  default     = false
}
