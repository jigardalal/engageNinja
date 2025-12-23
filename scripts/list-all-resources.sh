#!/bin/bash

# List all EngageNinja resources by tags using AWS CLI
# Usage: ./list-all-resources.sh [region]

REGION="${1:-us-east-1}"
PROJECT_TAG="EngageNinja"

echo "========================================================================"
echo "All EngageNinja Resources (by tags) - Region: $REGION"
echo "========================================================================"

# Function to list resources with tags
list_resources() {
  local service=$1
  local resource_type=$2

  echo ""
  echo "📦 $service:"
  echo "---"

  case $service in
    "RDS")
      aws rds describe-db-instances --region "$REGION" \
        --query "DBInstances[?Tags[?Key=='Project' && Value=='$PROJECT_TAG']].{ID:DBInstanceIdentifier,Status:DBInstanceStatus,Endpoint:Endpoint}" \
        --output table
      ;;
    "Lambda")
      aws lambda list-functions --region "$REGION" \
        --query "Functions[].FunctionName" --output text | tr '\t' '\n' | while read func; do
        TAGS=$(aws lambda list-tags-by-resource --resource "$func" --region "$REGION" --query "Tags.Project" --output text 2>/dev/null || echo "")
        if [ "$TAGS" = "$PROJECT_TAG" ]; then
          echo "$func"
        fi
      done
      ;;
    "SQS")
      aws sqs list-queues --region "$REGION" \
        --query "QueueUrls" --output text | tr '\t' '\n' | while read queue; do
        TAGS=$(aws sqs list-queue-tags --queue-url "$queue" --region "$REGION" --query "Tags.Project" --output text 2>/dev/null || echo "")
        if [ "$TAGS" = "$PROJECT_TAG" ]; then
          echo "$queue"
        fi
      done
      ;;
    "SNS")
      aws sns list-topics --region "$REGION" \
        --query "Topics[].TopicArn" --output text | tr '\t' '\n' | while read topic; do
        TAGS=$(aws sns list-tags-for-resource --resource-arn "$topic" --region "$REGION" --query "Tags[?Key=='Project'].Value" --output text 2>/dev/null || echo "")
        if [ "$TAGS" = "$PROJECT_TAG" ]; then
          echo "$topic"
        fi
      done
      ;;
    "API Gateway")
      aws apigatewayv2 get-apis --region "$REGION" \
        --query "Items[?Tags.Project=='$PROJECT_TAG'].{ID:ApiId,Name:Name}" --output table
      ;;
    "VPC")
      aws ec2 describe-vpcs --region "$REGION" \
        --filters "Name=tag:Project,Values=$PROJECT_TAG" \
        --query "Vpcs[].{VPC_ID:VpcId,CIDR:CidrBlock}" --output table
      ;;
    "Subnets")
      aws ec2 describe-subnets --region "$REGION" \
        --filters "Name=tag:Project,Values=$PROJECT_TAG" \
        --query "Subnets[].{Subnet_ID:SubnetId,CIDR:CidrBlock,AZ:AvailabilityZone}" --output table
      ;;
    "Security Groups")
      aws ec2 describe-security-groups --region "$REGION" \
        --filters "Name=tag:Project,Values=$PROJECT_TAG" \
        --query "SecurityGroups[].{ID:GroupId,Name:GroupName}" --output table
      ;;
    "Internet Gateway")
      aws ec2 describe-internet-gateways --region "$REGION" \
        --filters "Name=tag:Project,Values=$PROJECT_TAG" \
        --query "InternetGateways[].{IGW_ID:InternetGatewayId}" --output table
      ;;
    "CloudWatch Alarms")
      aws cloudwatch describe-alarms --region "$REGION" \
        --query "MetricAlarms[?contains(AlarmName,'engageninja')].{AlarmName:AlarmName,State:StateValue}" --output table
      ;;
  esac
}

# List all resources
list_resources "RDS" "DBInstances"
list_resources "Lambda" "Functions"
list_resources "SQS" "Queues"
list_resources "SNS" "Topics"
list_resources "API Gateway" "Apis"
list_resources "VPC" "Vpcs"
list_resources "Subnets" "Subnets"
list_resources "Security Groups" "SecurityGroups"
list_resources "Internet Gateway" "InternetGateways"
list_resources "CloudWatch Alarms" "Alarms"

echo ""
echo "========================================================================"
echo "✅ Resource listing complete"
echo "========================================================================"
