#!/usr/bin/env bash
# One-time: Entra app registration + federated credentials for GitHub Actions OIDC.
# Requires: Azure CLI, gh (GitHub CLI), subscription Contributor (or User Access Administrator for role assignment).
set -euo pipefail

GITHUB_ORG="${GITHUB_ORG:?Set GITHUB_ORG (GitHub owner/org)}"
GITHUB_REPO="${GITHUB_REPO:?Set GITHUB_REPO (repository name)}"
PROJECT_NAME="${PROJECT_NAME:-app}"
APP_NAME="github-${PROJECT_NAME}-terraform"
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-$(az account show --query id -o tsv)}"
TENANT_ID="${AZURE_TENANT_ID:-$(az account show --query tenantId -o tsv)}"

echo "Subscription: ${SUBSCRIPTION_ID}"
echo "Tenant:       ${TENANT_ID}"
echo "GitHub repo:  ${GITHUB_ORG}/${GITHUB_REPO}"

APP_ID=$(az ad app create --display-name "${APP_NAME}" --query appId -o tsv)
echo "Created app registration: ${APP_NAME} (${APP_ID})"

SP_ID=$(az ad sp create --id "${APP_ID}" --query id -o tsv)
echo "Created service principal: ${SP_ID}"

# Federated credentials for Terraform plan (PR) and apply (main)
az ad app federated-credential create --id "${APP_ID}" --parameters "{
  \"name\": \"github-pr-plan\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:pull_request\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"

az ad app federated-credential create --id "${APP_ID}" --parameters "{
  \"name\": \"github-main-apply\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/main\",
  \"audiences\": [\"api://AzureADTokenExchange\"]
}"

echo "Assigning Contributor on subscription (narrow to resource group after bootstrap if preferred)..."
az role assignment create \
  --assignee "${APP_ID}" \
  --role "Contributor" \
  --scope "/subscriptions/${SUBSCRIPTION_ID}"

echo ""
echo "Set GitHub repository variables (not secrets):"
echo "  AZURE_CLIENT_ID=${APP_ID}"
echo "  AZURE_TENANT_ID=${TENANT_ID}"
echo "  AZURE_SUBSCRIPTION_ID=${SUBSCRIPTION_ID}"
echo ""

if command -v gh >/dev/null 2>&1; then
  gh variable set AZURE_CLIENT_ID --body "${APP_ID}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh variable set AZURE_TENANT_ID --body "${TENANT_ID}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  gh variable set AZURE_SUBSCRIPTION_ID --body "${SUBSCRIPTION_ID}" --repo "${GITHUB_ORG}/${GITHUB_REPO}"
  echo "GitHub variables set via gh CLI."
else
  echo "Install gh CLI or set variables manually in GitHub → Settings → Secrets and variables → Actions → Variables."
fi
