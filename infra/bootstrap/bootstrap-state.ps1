# One-time bootstrap: Azure Storage account for Terraform remote state.
# Requires: Azure CLI (az), logged in with rights to create RG + storage.
param(
    [string]$ProjectName = "app",
    [string]$Location = "newzealandnorth",
    [string]$StorageSuffix = ""
)

$ErrorActionPreference = "Stop"

if (-not $StorageSuffix) {
    $StorageSuffix = -join ((48..57) + (97..122) | Get-Random -Count 8 | ForEach-Object { [char]$_ })
}

$TfstateRg = "rg-$ProjectName-tfstate"
$StorageAccount = "st${ProjectName}tf$StorageSuffix".ToLower().Substring(0, [Math]::Min(24, ("st${ProjectName}tf$StorageSuffix").Length))
$ContainerName = "tfstate"

Write-Host "Creating resource group: $TfstateRg ($Location)"
az group create --name $TfstateRg --location $Location --tags "project=$ProjectName" "managed_by=terraform" "purpose=tfstate"

Write-Host "Creating storage account: $StorageAccount"
az storage account create `
    --name $StorageAccount `
    --resource-group $TfstateRg `
    --location $Location `
    --sku Standard_LRS `
    --encryption-services blob `
    --min-tls-version TLS1_2 `
    --allow-blob-public-access false `
    --tags "project=$ProjectName" "managed_by=terraform" "purpose=tfstate"

Write-Host "Creating blob container: $ContainerName"
az storage container create `
    --name $ContainerName `
    --account-name $StorageAccount `
    --auth-mode login

Write-Host ""
Write-Host "Bootstrap complete. Update infra/providers.tf backend block:"
Write-Host @"

backend `"azurerm`" {
  resource_group_name  = `"$TfstateRg`"
  storage_account_name = `"$StorageAccount`"
  container_name       = `"$ContainerName`"
  key                  = `"$ProjectName.terraform.tfstate`"
}
"@
Write-Host ""
Write-Host "Use separate state keys per environment, e.g.:"
Write-Host "  $ProjectName-dev.terraform.tfstate"
Write-Host "  $ProjectName-prod.terraform.tfstate"
