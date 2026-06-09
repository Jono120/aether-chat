resource "azurerm_user_assigned_identity" "api" {
  count = var.key_vault_id != null ? 1 : 0

  name                = "${var.name}-identity"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_key_vault_access_policy" "api" {
  count = var.key_vault_id != null ? 1 : 0

  key_vault_id = var.key_vault_id
  tenant_id    = var.tenant_id
  object_id    = azurerm_user_assigned_identity.api[0].principal_id

  secret_permissions = ["Get"]
}

resource "azurerm_role_assignment" "acr_pull" {
  count = var.acr_id != null && var.key_vault_id != null ? 1 : 0

  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.api[0].principal_id
}

resource "azurerm_log_analytics_workspace" "api" {
  name                = "${var.name}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_container_app_environment" "this" {
  name                       = var.environment_name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.api.id
  infrastructure_subnet_id   = var.infrastructure_subnet_id
  internal_load_balancer_enabled = var.internal_load_balancer_enabled
  tags                       = var.tags
}

resource "azurerm_container_app" "api" {
  name                         = var.name
  container_app_environment_id = azurerm_container_app_environment.this.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  tags                         = var.tags

  dynamic "identity" {
    for_each = var.key_vault_id != null ? [1] : []
    content {
      type         = "UserAssigned"
      identity_ids = [azurerm_user_assigned_identity.api[0].id]
    }
  }

  dynamic "registry" {
    for_each = var.acr_login_server != null && var.key_vault_id != null ? [1] : []
    content {
      server   = var.acr_login_server
      identity = azurerm_user_assigned_identity.api[0].id
    }
  }

  dynamic "secret" {
    for_each = var.use_key_vault_refs ? var.key_vault_secret_refs : {}
    content {
      name                = secret.key
      key_vault_secret_id = secret.value
      identity            = azurerm_user_assigned_identity.api[0].id
    }
  }

  dynamic "secret" {
    for_each = var.use_key_vault_refs ? {} : var.secret_env
    content {
      name  = replace(secret.key, "_", "-")
      value = secret.value
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "api"
      image  = var.container_image
      cpu    = var.cpu
      memory = var.memory

      env {
        name  = "PORT"
        value = tostring(var.target_port)
      }

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.use_key_vault_refs ? var.key_vault_secret_env_map : var.secret_env
        content {
          name        = env.key
          secret_name = var.use_key_vault_refs ? env.value : replace(env.key, "_", "-")
        }
      }
    }
  }

  ingress {
    external_enabled = var.external_ingress
    target_port      = var.target_port
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}
