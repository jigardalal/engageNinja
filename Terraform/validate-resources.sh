#!/usr/bin/env bash
set -u
IFS=$'\n\t'

REGION="${1:-us-east-1}"
PROJECT="engageninja"
PROJECT_TAG="EngageNinja"  # Tag value uses capital letters
ENV="dev"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

echo "======================================================================"
echo "Validating EngageNinja AWS Resources in ${REGION}..."
echo "======================================================================"

# Check dependencies
if ! command -v aws >/dev/null 2>&1; then
  echo -e "${RED}✗ aws CLI not found; install and configure it before running this script${NC}" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo -e "${RED}✗ jq is required (https://stedolan.github.io/jq/) to parse responses${NC}" >&2
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "${REGION}")

# Helper functions
check_resource() {
  local name=$1
  local command=$2

  local output
  output=$(eval "$command" 2>&1) || output=""

  if [ -n "$output" ] && [ "$output" != "None" ] && [ "$output" != "null" ]; then
    echo -e "${GREEN}✓${NC} $name"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $name"
    ((FAILED++))
  fi
}

# ======================================================================
# 1. RDS DATABASE
# ======================================================================
echo ""
echo "1. RDS Database"
echo "---"
check_resource "RDS PostgreSQL Instance" \
  "aws rds describe-db-instances --db-instance-identifier ${PROJECT}-pg-${ENV} --region ${REGION} --query 'DBInstances[0].DBInstanceStatus' --output text"

# ======================================================================
# 2. VPC & NETWORKING
# ======================================================================
echo ""
echo "2. VPC & Networking"
echo "---"
VPC_COUNT=$(aws ec2 describe-vpcs --filters Name=tag:Project,Values=${PROJECT_TAG} --region ${REGION} --query 'length(Vpcs)' --output text 2>/dev/null || echo "0")
if [ "$VPC_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓${NC} VPC"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} VPC"
  ((FAILED++))
fi

SUBNET_COUNT=$(aws ec2 describe-subnets --filters Name=tag:Project,Values=${PROJECT_TAG} --region ${REGION} --query 'length(Subnets)' --output text 2>/dev/null || echo "0")
if [ "$SUBNET_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓${NC} Subnets ($SUBNET_COUNT found)"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Subnets"
  ((FAILED++))
fi

SG_COUNT=$(aws ec2 describe-security-groups --filters Name=group-name,Values=${PROJECT}-postgres-${ENV} --region ${REGION} --query 'length(SecurityGroups)' --output text 2>/dev/null || echo "0")
if [ "$SG_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓${NC} Security Group (Postgres)"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Security Group (Postgres)"
  ((FAILED++))
fi

IGW_COUNT=$(aws ec2 describe-internet-gateways --filters Name=tag:Project,Values=${PROJECT_TAG} --region ${REGION} --query 'length(InternetGateways)' --output text 2>/dev/null || echo "0")
if [ "$IGW_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓${NC} Internet Gateway"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Internet Gateway"
  ((FAILED++))
fi

# ======================================================================
# 3. LAMBDA FUNCTIONS
# ======================================================================
echo ""
echo "3. Lambda Functions"
echo "---"
check_resource "Lambda: send-campaign" \
  "aws lambda get-function --function-name ${PROJECT}-send-campaign-${ENV} --region ${REGION} --query 'Configuration.FunctionName' --output text"

check_resource "Lambda: update-message-status" \
  "aws lambda get-function --function-name ${PROJECT}-update-status-${ENV} --region ${REGION} --query 'Configuration.FunctionName' --output text"

check_resource "Lambda: twilio-webhook" \
  "aws lambda get-function --function-name ${PROJECT}-twilio-webhook-${ENV} --region ${REGION} --query 'Configuration.FunctionName' --output text"

check_resource "Lambda Event Source Mapping (SQS)" \
  "aws lambda list-event-source-mappings --function-name ${PROJECT}-send-campaign-${ENV} --region ${REGION} --query 'EventSourceMappings[0].UUID' --output text"

# ======================================================================
# 4. API GATEWAY
# ======================================================================
echo ""
echo "4. API Gateway (HTTP)"
echo "---"

API_ID=$(aws apigatewayv2 get-apis --region ${REGION} --query "Items[?Name=='${PROJECT}-webhooks-${ENV}'].ApiId" --output text 2>/dev/null || echo "")

if [ -n "$API_ID" ]; then
  echo -e "${GREEN}✓${NC} API Gateway"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} API Gateway"
  ((FAILED++))
  API_ID=""
fi

if [ -n "$API_ID" ]; then
  STAGE_COUNT=$(aws apigatewayv2 get-stages --api-id ${API_ID} --region ${REGION} --query 'length(Items)' --output text 2>/dev/null || echo "0")
  if [ "$STAGE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} API Gateway Stage"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} API Gateway Stage"
    ((FAILED++))
  fi
else
  echo -e "${RED}✗${NC} API Gateway Stage (API not found)"
  ((FAILED++))
fi

# ======================================================================
# 5. IAM ROLES & POLICIES
# ======================================================================
echo ""
echo "5. IAM Roles & Policies"
echo "---"

ROLE_NAME=$(aws iam list-roles --query "Roles[?contains(RoleName, '${PROJECT}-lambda-${ENV}')].RoleName" --output text 2>/dev/null | head -1)

if [ -n "$ROLE_NAME" ]; then
  echo -e "${GREEN}✓${NC} IAM Lambda Execution Role"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} IAM Lambda Execution Role"
  ((FAILED++))
fi

# ======================================================================
# 6. EVENTBRIDGE
# ======================================================================
echo ""
echo "6. EventBridge"
echo "---"

RULE_NAME=$(aws events list-rules --region ${REGION} --query "Rules[?starts_with(Name, '${PROJECT}-status-update-${ENV}')].Name" --output text 2>/dev/null | head -1)

if [ -n "$RULE_NAME" ]; then
  echo -e "${GREEN}✓${NC} EventBridge Rule (Status Updates)"
  ((PASSED++))

  check_resource "EventBridge Target (Lambda)" \
    "aws events list-targets-by-rule --rule ${RULE_NAME} --region ${REGION} --query 'Targets[0].Arn' --output text"
else
  echo -e "${RED}✗${NC} EventBridge Rule (Status Updates)"
  ((FAILED++))
  echo -e "${RED}✗${NC} EventBridge Target (Lambda)"
  ((FAILED++))
fi

# ======================================================================
# 7. SQS QUEUES
# ======================================================================
echo ""
echo "7. SQS Queues"
echo "---"
queue_names=(
  "${PROJECT}-messages-${ENV}"
  "${PROJECT}-sms-events-${ENV}"
  "${PROJECT}-email-events-${ENV}"
  "${PROJECT}-messages-dlq-${ENV}"
)

for queue_name in "${queue_names[@]}"; do
  check_resource "SQS Queue: $queue_name" \
    "aws sqs get-queue-url --queue-name ${queue_name} --region ${REGION} --query 'QueueUrl' --output text"
done

# ======================================================================
# 8. SNS TOPICS
# ======================================================================
echo ""
echo "8. SNS Topics"
echo "---"
topic_names=(
  "${PROJECT}-sms-events-${ENV}"
  "${PROJECT}-email-events-${ENV}"
)

for topic_name in "${topic_names[@]}"; do
  check_resource "SNS Topic: $topic_name" \
    "aws sns get-topic-attributes --topic-arn arn:aws:sns:${REGION}:${ACCOUNT_ID}:${topic_name} --region ${REGION} --query 'Attributes.TopicArn' --output text"
done

# ======================================================================
# 9. SES
# ======================================================================
echo ""
echo "9. SES Configuration"
echo "---"
check_resource "SES Configuration Set" \
  "aws ses describe-configuration-set --configuration-set-name ${PROJECT}-email-events --region ${REGION} --query 'ConfigurationSet.Name' --output text"

# ======================================================================
# SUMMARY
# ======================================================================
echo ""
echo "======================================================================"
echo -e "Validation Summary: ${GREEN}${PASSED} passed${NC}, ${RED}${FAILED} failed${NC}"
echo "======================================================================"

if [ $FAILED -gt 0 ]; then
  exit 1
fi

exit 0
