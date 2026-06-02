#!/usr/bin/env bash
# One-time bootstrap: Azure Storage account for Terraform remote state.
# Requires: Azure CLI (az), logged in with rights to create RG + storage.
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-app}"
LOCATION="${LOCATION:-newzealandnorth}"
TFSTATE_RG="rg-${PROJECT_NAME}-tfstate"
# Storage account names: 3-24 lowercase alphanumeric, globally unique
STORAGE_SUFFIX="${STORAGE_SUFFIX:-$(openssl rand -hex 4)}"
STORAGE_ACCOUNT="st${PROJECT_NAME}tf${STORAGE_SUFFIX}"
CONTAINER_NAME="tfstate"

echo "Creating resource group: ${TFSTATE_RG} (${LOCATION})"
az group create --name "${TFSTATE_RG}" --location "${LOCATION}" --tags "project=${PROJECT_NAME}" "managed_by=terraform" "purpose=tfstate"

echo "Creating storage account: ${STORAGE_ACCOUNT}"
az storage account create \
  --name "${STORAGE_ACCOUNT}" \
  --resource-group "${TFSTATE_RG}" \
  --location "${LOCATION}" \
  --sku Standard_LRS \
  --encryption-services blob \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --tags "project=${PROJECT_NAME}" "managed_by=terraform" "purpose=tfstate"

echo "Creating blob container: ${CONTAINER_NAME}"
az storage container create \
  --name "${CONTAINER_NAME}" \
  --account-name "${STORAGE_ACCOUNT}" \
  --auth-mode login

echo ""
echo "Bootstrap complete. Update infra/providers.tf backend block:"
echo ""
cat <<EOF
backend "azurerm" {
  resource_group_name  = "${TFSTATE_RG}"
  storage_account_name = "${STORAGE_ACCOUNT}"
  container_name       = "${CONTAINER_NAME}"
  key                  = "${PROJECT_NAME}.terraform.tfstate"
}
EOF
echo ""
echo "Use separate state keys per environment, e.g.:"
echo "  ${PROJECT_NAME}-dev.terraform.tfstate"
echo "  ${PROJECT_NAME}-prod.terraform.tfstate"
