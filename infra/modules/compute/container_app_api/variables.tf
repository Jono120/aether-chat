variable "name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "environment_name" {
  type = string
}

variable "tenant_id" {
  type        = string
  default     = null
  nullable    = true
  description = "Azure AD tenant ID for Key Vault access policy."
}

variable "key_vault_id" {
  type        = string
  default     = null
  nullable    = true
  description = "Key Vault resource ID for managed identity secret references."
}

variable "acr_id" {
  type        = string
  default     = null
  nullable    = true
  description = "Azure Container Registry resource ID for AcrPull role assignment."
}

variable "acr_login_server" {
  type        = string
  default     = null
  nullable    = true
  description = "ACR login server hostname for Container App registry block."
}

variable "use_key_vault_refs" {
  type    = bool
  default = false
}

variable "key_vault_secret_refs" {
  description = "Container App secret name -> Key Vault secret resource ID."
  type        = map(string)
  default     = {}
}

variable "key_vault_secret_env_map" {
  description = "Env var name -> Container App secret name when using Key Vault refs."
  type        = map(string)
  default     = {}
}

variable "infrastructure_subnet_id" {
  type        = string
  default     = null
  nullable    = true
  description = "Subnet ID for VNet-integrated Container Apps environment."
}

variable "internal_load_balancer_enabled" {
  type    = bool
  default = false
}

variable "container_image" {
  type    = string
  default = "mcr.microsoft.com/k8se/quickstart:latest"
}

variable "target_port" {
  type    = number
  default = 8080
}

variable "min_replicas" {
  type    = number
  default = 0
}

variable "max_replicas" {
  type    = number
  default = 3
}

variable "cpu" {
  type    = number
  default = 0.25
}

variable "memory" {
  type    = string
  default = "0.5Gi"
}

variable "external_ingress" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "env_vars" {
  description = "Plain environment variables for the API container."
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = "Inline secret environment variables (legacy; avoid in staging/prod)."
  type        = map(string)
  sensitive   = true
  default     = {}
}
