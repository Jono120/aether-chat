variable "name" {
  type        = string
  description = "Key Vault name (globally unique)."
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "tenant_id" {
  type        = string
  description = "Azure AD tenant id for Key Vault access policies."
}

variable "purge_protection_enabled" {
  type    = bool
  default = false
}

variable "soft_delete_retention_days" {
  type    = number
  default = 7
}

variable "tags" {
  type    = map(string)
  default = {}
}
