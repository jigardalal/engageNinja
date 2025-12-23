# EngageNinja AWS Infrastructure as Code (Terraform)

This Terraform scaffold provisions all AWS infrastructure for EngageNinja's messaging platform:
- **RDS PostgreSQL Database** for storing campaigns, contacts, messages, and more
- **Lambda Functions** for processing messages and webhooks (send-campaign, update-status, twilio-webhook)
- **API Gateway (HTTP)** for Twilio webhook endpoints
- **SQS Queues** for outbound messages and event processing
- **SNS Topics** for event routing
- **SES Configuration** for email tracking
- **EventBridge** for scheduled status updates
- **VPC & Networking** for secure database isolation
- **IAM User & Access Keys** for application authentication
- **CloudWatch Monitoring** for operational visibility
- **AWS Resource Groups** for viewing all resources in one place

---

## 📁 Files Overview

```
engageninja-terraform/
├── engageninja-terraform-main.tf        # Provider and Terraform config
├── engageninja-terraform-variables.tf   # Variable definitions
├── engageninja-terraform-db.tf          # RDS PostgreSQL, VPC, Subnets, Security Groups
├── engageninja-terraform-lambda.tf      # Lambda functions, API Gateway, EventBridge
├── engageninja-terraform-sqs.tf         # SQS queues and DLQ
├── engageninja-terraform-sns.tf         # SNS topics and subscriptions
├── engageninja-terraform-ses.tf         # SES configuration set
├── engageninja-terraform-iam.tf         # IAM user and policies
├── engageninja-terraform-monitoring.tf  # CloudWatch logs, alarms, and Resource Groups
├── engageninja-terraform-outputs.tf     # Output values (includes resource_index)
├── terraform.tfvars.example             # Example variables file
├── terraform.tfvars                     # Your configuration (do NOT commit)
├── validate-resources.sh                # Validation script to check all resources
├── TERRAFORM_SETUP_GUIDE.md             # Step-by-step setup guide
├── AWS_QUICK_REFERENCE.md               # AWS console navigation guide
└── README.md                            # This file
```

---

## 🚀 Quick Start

### 1. Install Terraform
```bash
# macOS
brew install terraform

# Linux/WSL
curl -fsSL https://apt.terraform.io/apt.gpg | sudo apt-key add -
sudo apt-add-repository "deb https://apt.terraform.io $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform
```

### 2. Set AWS Credentials
```bash
# Option A: AWS Credentials file
mkdir -p ~/.aws
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF

# Option B: Environment variables
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
export AWS_REGION="us-east-1"
```

### 3. Create terraform.tfvars
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit with your values
```

### 4. Deploy Infrastructure
```bash
terraform init      # Initialize Terraform
terraform plan      # Review changes
terraform apply     # Create resources
```

### 4.1 Build Lambda Artifacts
The Node.js Lambdas live under the `lambda/` directory and must be bundled before Terraform references them. Run this once after cloning or when dependencies change:

```bash
cd lambda
npm install
```

This generates `lambda/build/engageninja-lambdas.zip`, which Terraform packages via the `archive_file` data source.

### 4.2 Validate Infrastructure
After deployment, verify all resources were created correctly:

```bash
bash validate-resources.sh us-east-1
```

This checks:
- ✅ RDS Database
- ✅ VPC & Networking
- ✅ Lambda Functions
- ✅ API Gateway
- ✅ IAM Roles
- ✅ EventBridge
- ✅ SQS Queues
- ✅ SNS Topics
- ✅ SES Configuration

### 5. Retrieve Configuration
```bash
# Get all outputs
terraform output

# Get credentials (sensitive)
terraform output -json sensitive_credentials > .env

# Get SQS/SNS URLs
terraform output application_configuration
```

---

## 🔍 View All Resources

### Option 1: AWS Resource Group (Recommended for AWS Console)
View all your EngageNinja resources in one place on AWS Console:

```bash
terraform output resource_group_console_url
```

Click the URL to see all resources organized by service in the AWS Resource Groups console.

**Console Link Format:**
```
https://console.aws.amazon.com/resource-groups/groups/engageninja-all-resources-dev?region=us-east-1
```

### Option 2: Terraform Resource Index (Most Complete)
Get IDs and direct console links for all resources:

```bash
# View in terminal
terraform output resource_index

# Get as JSON
terraform output -json resource_index | jq
```

This includes:
- RDS Database instance ID and endpoint
- Lambda function names and ARNs
- SQS queue URLs and ARNs
- SNS topic ARNs
- API Gateway ID and invoke URL
- VPC, Subnets, Security Groups
- CloudWatch Alarms
- Direct AWS Console links for each resource

### Option 3: AWS CLI Scripts
Quick view of all resources using AWS CLI:

```bash
# Simple summary view
bash ../scripts/view-all-resources.sh us-east-1

# Detailed view (lists each resource by type)
bash ../scripts/list-all-resources.sh us-east-1
```

### Option 4: Individual Service Consoles
All resources are tagged with:
- `Project=EngageNinja`
- `Service=<ServiceType>` (Lambda, RDS, SQS, etc.)
- `Environment=dev` (or your configured environment)

Use these tags to filter in any AWS service console.

---

## 📋 What Gets Created

### RDS Database
- **PostgreSQL Database**: `engageninja-pg-dev` (version 17.4)
- **Database Schema**: campaigns, contacts, messages, templates, audit logs, subscriptions, etc.
- **Endpoint**: Automatically generated, accessible from Lambda and backend
- **Storage**: 20GB initial, auto-scales up to 100GB
- **Backup**: 1-day retention with automated backups

### VPC & Networking
- **VPC**: Custom VPC with CIDR `10.10.0.0/16`
- **Subnets**: 2 subnets across different availability zones
- **Security Group**: Allows PostgreSQL (5432) access
- **Internet Gateway**: For outbound internet access

### Lambda Functions
- `engageninja-send-campaign-dev` - Processes outbound messages from SQS
- `engageninja-update-status-dev` - Updates message status from EventBridge
- `engageninja-twilio-webhook-dev` - Receives Twilio webhook callbacks

### API Gateway (HTTP)
- **Webhook API**: `engageninja-webhooks-dev`
- **Routes**:
  - `POST /webhooks/twilio` - Twilio message delivery events
  - `POST /webhooks/twilio/sms` - Twilio SMS delivery events

### EventBridge
- **Rule**: `engageninja-status-update-dev` - Scheduled status update events
- **Target**: Triggers Lambda function for message status updates

### SQS Queues
- `engageninja-messages-dev` - Outbound campaign messages
- `engageninja-sms-events-dev` - SMS delivery status events
- `engageninja-email-events-dev` - Email delivery/bounce/complaint events
- `engageninja-messages-dlq-dev` - Dead Letter Queue for failed messages

### SNS Topics
- `engageninja-sms-events-dev` - SMS events topic (ingests delivery statuses from your messaging provider)
- `engageninja-email-events-dev` - Email events topic (receives from SES)

### SES
- **Configuration Set**: `engageninja-email-events`
- **Event Destination** for bounce/complaint/delivery tracking

### IAM
- **User**: `engageninja-app-dev`
- **Access Key ID & Secret** (auto-generated)
- **Policies** for SQS, SNS, SES, SMS, CloudWatch Logs, RDS
- **Lambda Execution Role** with permissions for SQS, SNS, RDS, CloudWatch

### Monitoring
- **CloudWatch Log Group**: `/aws/engageninja/dev/app`
- **CloudWatch Alarms**:
  - Queue depth monitoring (messages queue)
  - DLQ message detection (failed messages)
  - SES bounce rate tracking
- **AWS Resource Group**: `engageninja-all-resources-dev` (view all resources together)

---

## 🔧 Configuration

### Environment Variables

Edit `terraform.tfvars` to customize:

```hcl
# AWS Configuration
aws_region                     = "us-east-1"
environment                    = "dev"  # or "staging", "prod"
project_name                   = "engageninja"

# Database Configuration
db_engine_version              = "17.4"        # PostgreSQL version
db_instance_class              = "db.t3.micro" # Instance type (free tier)
db_allocated_storage           = 20            # Initial storage in GB
db_max_allocated_storage       = 100           # Maximum storage in GB
db_backup_retention_days       = 1             # Backup retention
db_name                        = "engageninja" # Database name
db_username                    = "engageninja" # Master username
db_master_password             = ""            # Leave empty to auto-generate

# Lambda Configuration
lambda_timeout_seconds         = 30            # Lambda timeout
lambda_memory_mb               = 512           # Lambda memory

# SQS Configuration
sqs_message_retention_seconds  = 1209600       # 14 days
sqs_visibility_timeout_seconds = 300           # 5 minutes

# SES Configuration
ses_configuration_set_name     = "engageninja-email-events"

# Monitoring
enable_cloudwatch_logs         = true
log_retention_days             = 30

# Tagging
tags = {
  Environment = "dev"
  Project     = "EngageNinja"
  Team        = "Backend"
}
```

### Scaling for Production

For production deployment, update `terraform.tfvars`:

```hcl
# Environment
environment                    = "prod"

# Database - Scale up from free tier
db_instance_class              = "db.t3.small"  # Larger instance for production
db_allocated_storage           = 100            # Start with 100GB
db_max_allocated_storage       = 1000           # Scale to 1TB if needed
db_backup_retention_days       = 7              # 7-day retention for production
db_master_password             = "your-secure-password"  # Use strong password

# Lambda - Scale up memory for faster processing
lambda_timeout_seconds         = 60             # Longer timeout for large batches
lambda_memory_mb               = 1024           # More memory = faster processing

# SQS - Longer visibility timeout for slower processing
sqs_message_retention_seconds  = 604800  # 7 days
sqs_visibility_timeout_seconds = 600     # 10 minutes for slower processors

# Monitoring
log_retention_days             = 90
enable_cloudwatch_logs         = true

# Tagging
tags = {
  Environment = "prod"
  Project     = "EngageNinja"
  CostCenter  = "Product"
  Owner       = "YourTeam"
}
```

---

## 📊 Architecture

```
EngageNinja Multi-Tenant SaaS Platform
│
├─→ Backend Node.js App (ECS/Fargate)
│   ├─→ RDS PostgreSQL (campaigns, contacts, messages, tenants)
│   ├─→ Campaign Creation
│   │   └─→ SQS: Outbound Messages Queue
│   │       └─→ Lambda: send-campaign-dev
│   │           ├─→ Send via WhatsApp (Meta API)
│   │           ├─→ Send via Email (SES)
│   │           └─→ Send via SMS (Twilio)
│   │
│   └─→ Status Updates (Webhooks from providers)
│       ├─→ API Gateway (HTTP) ─→ Lambda: twilio-webhook-dev
│       │   └─→ SNS: SMS Events Topic ─→ SQS: SMS Events Queue
│       ├─→ SNS: Email Events Topic ─→ SQS: Email Events Queue
│       │
│       └─→ EventBridge (scheduled)
│           └─→ Lambda: update-message-status-dev
│               └─→ RDS: Update message status

CloudWatch:
  - Logs: Application logs, Lambda logs
  - Alarms: Queue depth, DLQ messages, SES bounce rate

AWS Resource Group:
  - engageninja-all-resources-dev (one-click view of all infrastructure)

VPC:
  - RDS: Private subnet with security group
  - Lambda: VPC-enabled for RDS access
  - API Gateway: Public HTTP endpoint
```

---

## 📝 Integration with Node.js Application

### 1. Install AWS SDK
```bash
npm install aws-sdk
```

### 2. Update .env with Terraform Outputs
```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# SQS URLs
SQS_MESSAGES_URL=https://sqs.us-east-1.amazonaws.com/...
SQS_SMS_EVENTS_URL=https://sqs.us-east-1.amazonaws.com/...
SQS_EMAIL_EVENTS_URL=https://sqs.us-east-1.amazonaws.com/...

# SNS Topics
SNS_SMS_EVENTS_TOPIC_ARN=arn:aws:sns:us-east-1:...
SNS_EMAIL_EVENTS_TOPIC_ARN=arn:aws:sns:us-east-1:...

# SES
SES_CONFIGURATION_SET=engageninja-email-events
SES_FROM_EMAIL=noreply@yourdomain.com
```

### 3. Update messageQueue.js

Replace polling with SQS:

```javascript
const AWS = require('aws-sdk');

const sqs = new AWS.SQS({
  region: process.env.AWS_REGION
});

// Send message to outbound queue
async function queueOutboundMessage(campaignId, contactId, channel) {
  const params = {
    QueueUrl: process.env.SQS_MESSAGES_URL,
    MessageBody: JSON.stringify({
      campaignId,
      contactId,
      channel,
      timestamp: new Date().toISOString()
    })
  };

  return sqs.sendMessage(params).promise();
}

// Poll SQS for events
async function processSMSEvents() {
  const params = {
    QueueUrl: process.env.SQS_SMS_EVENTS_URL,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20  // Long polling
  };

  const messages = await sqs.receiveMessage(params).promise();
  
  if (messages.Messages) {
    for (const message of messages.Messages) {
      await handleSMSEvent(JSON.parse(message.Body));
      
      // Delete message after processing
      await sqs.deleteMessage({
        QueueUrl: process.env.SQS_SMS_EVENTS_URL,
        ReceiptHandle: message.ReceiptHandle
      }).promise();
    }
  }
}
```

---

## 🔐 Security

### Best Practices
1. ✅ Never commit `.env` or `terraform.tfvars` to version control
2. ✅ Use AWS Secrets Manager for production credentials
3. ✅ Rotate IAM access keys every 90 days
4. ✅ Enable CloudTrail for audit logging
5. ✅ Restrict SQS/SNS access to specific security groups (Phase 2)
6. ✅ Use HTTPS for all queue connections
7. ✅ Encrypt sensitive data at rest (enabled by default)

### IAM Permissions

The generated IAM user has minimum required permissions:
- SQS: Send, Receive, Delete messages
- SNS: Publish to topics
- SES: Send emails via SendEmail/SendRawEmail
- CloudWatch Logs: Write logs

---

## 🧪 Testing

### Test SQS
```bash
# Send test message
aws sqs send-message \
  --queue-url $SQS_MESSAGES_URL \
  --message-body '{"test":true}' \
  --region us-east-1

# Receive messages
aws sqs receive-message \
  --queue-url $SQS_MESSAGES_URL \
  --region us-east-1
```

### Test SES
```bash
# Send test email (must use verified sender)
aws ses send-email \
  --from noreply@yourdomain.com \
  --to recipient@example.com \
  --subject "Test" \
  --text "Test email" \
  --region us-east-1
```

### Test SNS
```bash
# Publish test message
aws sns publish \
  --topic-arn $SNS_SMS_EVENTS_TOPIC_ARN \
  --message '{"eventType":"delivery"}' \
  --region us-east-1
```

---

## 📚 Useful Commands

```bash
# Terraform
terraform init              # Initialize
terraform plan              # Review changes
terraform apply             # Deploy
terraform destroy           # Cleanup
terraform output            # Show outputs
terraform state list        # List resources

# AWS CLI
aws sqs list-queues --region us-east-1
aws sns list-topics --region us-east-1
aws ses list-identities --region us-east-1
aws iam list-users
aws logs describe-log-groups --region us-east-1

# Monitor CloudWatch Logs
aws logs tail /aws/engageninja/dev/app --follow --region us-east-1
```

---

## 🐛 Troubleshooting

### "Invalid credentials"
- Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- Ensure credentials haven't expired

### "Not authorized to perform"
- IAM user needs more permissions
- Check attached policies

### "Queue does not exist"
- Run `terraform apply` to create queues
- Check SQS_MESSAGES_URL is correct

---
## 📖 Documentation

- [Complete Setup Guide](./TERRAFORM_SETUP_GUIDE.md)
- [AWS SQS Documentation](https://docs.aws.amazon.com/sqs/)
- [AWS SNS Documentation](https://docs.aws.amazon.com/sns/)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)
- [Twilio Messaging API](https://www.twilio.com/docs/sms)

---

## 🎯 Next Steps

1. ✅ Copy Terraform files to your project
2. ✅ Set AWS credentials
3. ✅ Create `terraform.tfvars` file
4. ✅ Run `terraform init` and `terraform apply`
5. ✅ Retrieve credentials and SQS URLs
6. ✅ Update Node.js app with SQS configuration
7. ✅ Verify SES sender identity
8. ✅ Test message sending via SQS
9. ✅ Set up CloudWatch monitoring
10. ✅ Deploy to ECS Fargate with environment variables

---

## 💡 Tips

- Start with `environment = "dev"` for testing
- Use different `terraform.tfvars` for staging and production
- Keep Terraform state in S3 (remote backend) for team collaboration
- Set up AWS Secrets Manager integration for ECS task environment variables
- Enable CloudTrail for audit logging

---

## Support

For issues:
1. Check [TERRAFORM_SETUP_GUIDE.md](./TERRAFORM_SETUP_GUIDE.md) for detailed steps
2. Review CloudWatch logs: `/aws/engageninja/dev/app`
3. Check AWS console for resource status
4. Verify IAM permissions
5. Test with AWS CLI before Node.js app

---

## 🧹 Complete Teardown

Run `./destroy-complete.sh` from this directory after your tests to execute `terraform destroy` and delete the SES configuration set. Override `PROJECT_NAME`, `ENVIRONMENT`, or `SES_CONFIGURATION_SET_NAME` via environment variables when you deployed with custom names.

---

## 🔄 Recent Updates

### December 2025 - Production Infrastructure
- ✅ **Database**: Added RDS PostgreSQL (v17.4) with auto-scaling storage
- ✅ **Lambda Functions**: Added 3 Lambda functions (send-campaign, update-status, twilio-webhook)
- ✅ **API Gateway**: Added HTTP API for Twilio webhooks
- ✅ **VPC & Networking**: Added custom VPC, subnets, security groups for database isolation
- ✅ **EventBridge**: Added scheduled rules for message status updates
- ✅ **Resource Groups**: AWS Resource Group for viewing all resources in one place
- ✅ **Tagging**: All resources tagged with Project, Service, and Environment
- ✅ **Validation**: Added `validate-resources.sh` script to verify deployment
- ✅ **Resource Viewing**:
  - Terraform resource index with direct console links
  - AWS CLI scripts for resource discovery
  - AWS Resource Group in console (one-click view)
- ✅ **Documentation**: Complete README with architecture, configuration, and examples

---

**Created:** December 2025
**Last Updated:** December 2025
**Maintainer:** EngageNinja Team
**License:** MIT
