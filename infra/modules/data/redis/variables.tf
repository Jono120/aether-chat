variable "name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "capacity" {
  type    = number
  default = 0
}

variable "family" {
  type    = string
  default = "C"
}

variable "sku_name" {
  type    = string
  default = "Basic"
}

variable "minimum_tls_version" {
  type    = string
  default = "1.2"
}

variable "tags" {
  type    = map(string)
  default = {}
}
