# Infrastructure (Terraform)

Terraform manages Azure Static Web Apps hosting and an optional backend platform (PostgreSQL, Container Apps API, SignalR, Service Bus, storage).

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`) logged in
- [GitHub CLI](https://cli.github.com/) (`gh`) optional — used by bootstrap scripts to set repository variables
- Azure subscription with permission to create resource groups and Static Web Apps

## Layout

```text
infra/
├── main.tf                 # Resource group + Static Web App
├── backend_platform.tf     # Optional backend (enable_backend)
├── modules/
│   ├── data/               # key_vault, postgresql, storage, cosmos, redis
│   ├── compute/            # container_app_api, function_workers, signalr
│   └── messaging/        # service_bus
├── variables.tf
├── outputs.tf
├── environments/           # dev.tfvars, prod.tfvars
└── bootstrap/
```

Set `enable_backend = true` and `postgres_admin_password` (via `TF_VAR_postgres_admin_password`) to provision the data plane. See [docs/BACKEND.md](../docs/BACKEND.md).

## Phase 0 — Bootstrap (one-time)

### 1. Remote state storage

Pick a globally unique storage account suffix and run:

**Bash (Linux/macOS/WSL):**

```bash
export PROJECT_NAME=aether
export LOCATION=newzealandnorth
./infra/bootstrap/bootstrap-state.sh
```

**PowerShell:**

```powershell
.\infra\bootstrap\bootstrap-state.ps1 -ProjectName aether -Location newzealandnorth
```

Copy the printed backend block into `infra/backend.hcl` (from `backend.hcl.example`) and set the state `key` per environment:

| Environment | Suggested state key |
|-------------|---------------------|
| dev | `aether-dev.terraform.tfstate` |
| prod | `aether-prod.terraform.tfstate` |

Initialise with the backend file:

```bash
cd infra
terraform init -backend-config=backend.hcl
```

### 2. Entra ID OIDC for GitHub Actions (Terraform workflow)

Replace org/repo with your GitHub repository:

**Bash:**

```bash
export GITHUB_ORG=your-org
export GITHUB_REPO=your-repo
export PROJECT_NAME=aether
./infra/bootstrap/setup-oidc.sh
```

**PowerShell:**

```powershell
.\infra\bootstrap\setup-oidc.ps1 -GithubOrg your-org -GithubRepo your-repo -ProjectName aether
```

This creates an app registration, federated credentials for `pull_request` (plan) and `refs/heads/main` (apply), assigns **Contributor** on the subscription, and sets GitHub **variables**:

| Variable | Purpose |
|----------|---------|
| `AZURE_CLIENT_ID` | Entra app (service principal) client ID |
| `AZURE_TENANT_ID` | Azure AD tenant |
| `AZURE_SUBSCRIPTION_ID` | Target subscription |

Narrow the role assignment to `rg-{project}-{env}` after initial apply if you prefer least privilege.

After bootstrap, set additional GitHub **variables** for the Terraform workflow:

| Variable | Example |
|----------|---------|
| `TFSTATE_RESOURCE_GROUP` | `rg-aether-tfstate` |
| `TFSTATE_STORAGE_ACCOUNT` | from bootstrap output |
| `TFSTATE_CONTAINER` | `tfstate` |
| `TF_PROJECT_NAME` | `aether` (must match state key prefix) |

### 3. First Terraform apply + deployment token

```bash
cd infra
terraform init -backend-config=backend.hcl
terraform plan -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

Capture the sensitive output and store it as a GitHub **secret**:

```bash
terraform output -raw static_web_app_api_key
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --repo your-org/your-repo
```

### 4. Verify site URL

```bash
terraform output static_web_app_default_hostname
```

After the deploy workflow runs, open `https://<hostname>`.

## Day-to-day operations

| Task | Command / workflow |
|------|-------------------|
| Plan (local) | `terraform plan -var-file=environments/dev.tfvars` |
| Apply (CI) | Push to `main` when `infra/**` changes → `terraform.yml` |
| Deploy app | Push app changes to `main` → `deploy-app.yml` |
| Rotate SWA token | Re-apply Terraform or regenerate in Azure Portal → update `AZURE_STATIC_WEB_APPS_API_TOKEN` |

## Variables

All Terraform resources are driven by generic variables in `variables.tf`. Environment-specific values live in `environments/*.tfvars` only — do not hardcode project names in `.tf` files.

| Variable | Description |
|----------|-------------|
| `project_name` | Short identifier for tags and resource group naming |
| `environment` | `dev`, `prod`, `staging`, or `test` |
| `location` | Azure region (must support Static Web Apps) |
| `static_web_app_name` | Globally unique SWA name |
| `sku_tier` / `sku_size` | `Free` or `Standard` |
| `tags` | Optional extra tags |

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for full architecture, rollback, and troubleshooting.
