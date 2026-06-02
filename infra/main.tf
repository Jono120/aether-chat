locals {
  common_tags = merge(
    {
      project     = var.project_name
      environment = var.environment
      managed_by  = "terraform"
    },
    var.tags
  )

  resource_group_name = "rg-${var.project_name}-${var.environment}"
}

resource "azurerm_resource_group" "app" {
  name     = local.resource_group_name
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_static_web_app" "app" {
  name                = var.static_web_app_name
  resource_group_name = azurerm_resource_group.app.name
  location            = var.location
  sku_tier            = var.sku_tier
  sku_size            = var.sku_size
  tags                = local.common_tags

  lifecycle {
    ignore_changes = [
      repository_url,
      repository_branch,
      repository_token,
    ]
  }
}
