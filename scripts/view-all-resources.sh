#!/bin/bash

# Quick view of all EngageNinja resources
# Usage: ./view-all-resources.sh [region]

REGION="${1:-us-east-1}"

echo "========================================================================"
echo "EngageNinja Resources Summary - Region: $REGION"
echo "========================================================================"

# RDS
echo ""
echo "🗄️  RDS Databases:"
aws rds describe-db-instances --region "$REGION" \
  --query "DBInstances[?Tags[?Key=='Project' && Value=='EngageNinja']].{ID:DBInstanceIdentifier,Status:DBInstanceStatus,Engine:Engine,Version:EngineVersion}" \
  --output table 2>/dev/null || echo "No RDS instances found"

# Lambda Functions
echo ""
echo "⚡ Lambda Functions:"
aws lambda list-functions --region "$REGION" \
  --query "Functions[?Tags.Project=='EngageNinja'].{Name:FunctionName,Runtime:Runtime,Memory:MemorySize}" \
  --output table 2>/dev/null || echo "No Lambda functions found"

# SQS Queues
echo ""
echo "📨 SQS Queues:"
aws sqs list-queues --region "$REGION" \
  --query "QueueUrls" --output text 2>/dev/null | tr '\t' '\n' | while read queue; do
  if [[ ! -z "$queue" ]]; then
    NAME=$(echo "$queue" | rev | cut -d/ -f1 | rev)
    echo "  • $NAME"
  fi
done || echo "No SQS queues found"

# SNS Topics
echo ""
echo "📢 SNS Topics:"
aws sns list-topics --region "$REGION" \
  --query "Topics[].TopicArn" --output text 2>/dev/null | tr '\t' '\n' | while read topic; do
  if [[ ! -z "$topic" ]]; then
    NAME=$(echo "$topic" | rev | cut -d: -f1 | rev)
    echo "  • $NAME"
  fi
done || echo "No SNS topics found"

# API Gateway
echo ""
echo "🌐 API Gateway (HTTP):"
aws apigatewayv2 get-apis --region "$REGION" \
  --query "Items[?Tags.Project=='EngageNinja'].{Name:Name,ApiId:ApiId,Protocol:ProtocolType}" \
  --output table 2>/dev/null || echo "No APIs found"

# VPC
echo ""
echo "🔗 VPC:"
aws ec2 describe-vpcs --region "$REGION" \
  --filters "Name=tag:Project,Values=EngageNinja" \
  --query "Vpcs[].{VPC_ID:VpcId,CIDR:CidrBlock,State:State}" \
  --output table 2>/dev/null || echo "No VPCs found"

# Security Groups
echo ""
echo "🛡️  Security Groups:"
aws ec2 describe-security-groups --region "$REGION" \
  --filters "Name=tag:Project,Values=EngageNinja" \
  --query "SecurityGroups[].{Name:GroupName,ID:GroupId}" \
  --output table 2>/dev/null || echo "No security groups found"

# Resource Group
echo ""
echo "📦 Resource Group:"
aws resource-groups list-groups --region "$REGION" \
  --query "GroupIdentifiers[?Name=='engageninja-all-resources-dev'].{Name:Name,GroupArn:GroupArn}" \
  --output table 2>/dev/null || echo "Resource group not found"

echo ""
echo "========================================================================"
echo "✅ Run this anytime to see all resources:"
echo "   ./view-all-resources.sh us-east-1"
echo "========================================================================"
