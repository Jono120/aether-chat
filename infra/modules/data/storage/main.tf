resource "azurerm_storage_account" "this" {
  name                     = var.name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  allow_nested_items_to_be_public = false
  tags                     = var.tags
}

resource "azurerm_storage_container" "media" {
  name                  = "media"
  storage_account_id  = azurerm_storage_account.this.id
  container_access_type = "private"
}

resource "azurerm_storage_management_policy" "media_ttl" {
  storage_account_id = azurerm_storage_account.this.id

  rule {
    name    = "delete-expired-media"
    enabled = true

    filters {
      prefix_match = ["media/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = var.media_retention_days
      }
    }
  }
}
