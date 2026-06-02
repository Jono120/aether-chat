provider "azurerm" {
  features {}
}

# Remote state — configure via backend.hcl (copy from backend.hcl.example after bootstrap)
terraform {
  backend "azurerm" {}
}
