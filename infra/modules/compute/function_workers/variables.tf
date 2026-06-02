variable "name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "storage_account_name" {
  type = string
}

variable "storage_account_access_key" {
  type      = string
  sensitive = true
}

variable "service_plan_sku" {
  type    = string
  default = "Y1"
}

variable "tags" {
  type    = map(string)
  default = {}
}
