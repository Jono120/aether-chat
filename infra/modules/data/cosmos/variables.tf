variable "name" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_group_name" {
  type = string
}

variable "offer_type" {
  type    = string
  default = "Standard"
}

variable "kind" {
  type    = string
  default = "GlobalDocumentDB"
}

variable "database_name" {
  type    = string
  default = "aether"
}

variable "container_name" {
  type    = string
  default = "messages"
}

variable "partition_key_path" {
  type    = string
  default = "/conversationId"
}

variable "tags" {
  type    = map(string)
  default = {}
}
