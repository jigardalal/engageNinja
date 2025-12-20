#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# Environment overrides
PROJECT_NAME="${PROJECT_NAME:-engageninja}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
SES_CONFIGURATION_SET="${SES_CONFIGURATION_SET_NAME:-engageninja-email-events}"
SMS_POOL_ID="${SMS_POOL_ID:-}"

SMS_CONFIG_SET_NAME="${PROJECT_NAME}-sms-config-${ENVIRONMENT}"
SMS_PROTECT_TAG_NAME="${PROJECT_NAME}-protect-config-${ENVIRONMENT}"

echo "Destroying Terraform-managed infrastructure..."
terraform destroy -auto-approve

echo "Tearing down AWS Pinpoint SMS configuration set (${SMS_CONFIG_SET_NAME})..."
aws pinpoint-sms-voice-v2 delete-configuration-set \
  --configuration-set-name "${SMS_CONFIG_SET_NAME}" \
  --region "${AWS_REGION}" \
  >/dev/null 2>&1 || true

echo "Deleting Pinpoint SMS protect configuration tagged ${SMS_PROTECT_TAG_NAME}..."
PROTECT_ID=$(aws pinpoint-sms-voice-v2 describe-protect-configurations \
  --region "${AWS_REGION}" \
  --query "ProtectConfigurations[?ProtectConfigurationArn!=null && Tags[?Key=='Name' && Value=='${SMS_PROTECT_TAG_NAME}']].ProtectConfigurationId" \
  --output text || true)

if [[ -n "${PROTECT_ID}" ]] && [[ "${PROTECT_ID}" != "None" ]]; then
  aws pinpoint-sms-voice-v2 delete-protect-configuration \
    --protect-configuration-id "${PROTECT_ID}" \
    --region "${AWS_REGION}" \
    >/dev/null 2>&1 || true
else
  echo "Protect configuration not found, skipping."
fi

if [[ -n "${SMS_POOL_ID}" ]]; then
  echo "Removing SMS phone pool (${SMS_POOL_ID})..."
  aws pinpoint-sms-voice-v2 delete-phone-number-pool \
    --pool-id "${SMS_POOL_ID}" \
    --region "${AWS_REGION}" \
    >/dev/null 2>&1 || true
fi

echo "Deleting SES configuration set (${SES_CONFIGURATION_SET})..."
aws ses delete-configuration-set \
  --configuration-set-name "${SES_CONFIGURATION_SET}" \
  --region "${AWS_REGION}" \
  >/dev/null 2>&1 || true

echo "Cleanup complete."
