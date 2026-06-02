# One-time: Entra app registration + federated credentials for GitHub Actions OIDC.
# Requires: Azure CLI, gh (GitHub CLI), subscription Contributor (or User Access Administrator).
param(
    [Parameter(Mandatory = $true)]
    [string]$GithubOrg,
    [Parameter(Mandatory = $true)]
    [string]$GithubRepo,
    [string]$ProjectName = "app"
)

$ErrorActionPreference = "Stop"

$AppName = "github-$ProjectName-terraform"
$SubscriptionId = if ($env:AZURE_SUBSCRIPTION_ID) { $env:AZURE_SUBSCRIPTION_ID } else { az account show --query id -o tsv }
$TenantId = if ($env:AZURE_TENANT_ID) { $env:AZURE_TENANT_ID } else { az account show --query tenantId -o tsv }

Write-Host "Subscription: $SubscriptionId"
Write-Host "Tenant:       $TenantId"
Write-Host "GitHub repo:  $GithubOrg/$GithubRepo"

$AppId = az ad app create --display-name $AppName --query appId -o tsv
Write-Host "Created app registration: $AppName ($AppId)"

$SpId = az ad sp create --id $AppId --query id -o tsv
Write-Host "Created service principal: $SpId"

$PrCred = @{
    name      = "github-pr-plan"
    issuer    = "https://token.actions.githubusercontent.com"
    subject   = "repo:${GithubOrg}/${GithubRepo}:pull_request"
    audiences = @("api://AzureADTokenExchange")
} | ConvertTo-Json -Compress

$MainCred = @{
    name      = "github-main-apply"
    issuer    = "https://token.actions.githubusercontent.com"
    subject   = "repo:${GithubOrg}/${GithubRepo}:ref:refs/heads/main"
    audiences = @("api://AzureADTokenExchange")
} | ConvertTo-Json -Compress

az ad app federated-credential create --id $AppId --parameters $PrCred
az ad app federated-credential create --id $AppId --parameters $MainCred

Write-Host "Assigning Contributor on subscription..."
az role assignment create --assignee $AppId --role "Contributor" --scope "/subscriptions/$SubscriptionId"

Write-Host ""
Write-Host "GitHub repository variables:"
Write-Host "  AZURE_CLIENT_ID=$AppId"
Write-Host "  AZURE_TENANT_ID=$TenantId"
Write-Host "  AZURE_SUBSCRIPTION_ID=$SubscriptionId"

if (Get-Command gh -ErrorAction SilentlyContinue) {
    gh variable set AZURE_CLIENT_ID --body $AppId --repo "$GithubOrg/$GithubRepo"
    gh variable set AZURE_TENANT_ID --body $TenantId --repo "$GithubOrg/$GithubRepo"
    gh variable set AZURE_SUBSCRIPTION_ID --body $SubscriptionId --repo "$GithubOrg/$GithubRepo"
    Write-Host "GitHub variables set via gh CLI."
} else {
    Write-Host "Install gh CLI or set variables in GitHub → Settings → Actions → Variables."
}
