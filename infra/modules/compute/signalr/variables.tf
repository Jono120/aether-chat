variable "name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "sku_name" {
  type    = string
  default = "Free_F1"
}

variable "capacity" {
  type    = number
  default = 1
}

variable "tags" {
  type    = map(string)
  default = {}
}
