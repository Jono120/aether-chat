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
  description = "Secret environment variables (name -> value) stored as Container App secrets."
  type        = map(string)
  sensitive   = true
  default     = {}
}
