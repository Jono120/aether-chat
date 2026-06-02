variable "namespace_name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "sku" {
  type    = string
  default = "Basic"
}

variable "deletion_queue_name" {
  type    = string
  default = "account-deletion"
}

variable "tags" {
  type    = map(string)
  default = {}
}
