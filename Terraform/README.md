# EngageNinja AWS Infrastructure as Code (Terraform)

This Terraform scaffold provisions all AWS infrastructure for EngageNinja's messaging platform:
- **SQS Queues** for outbound messages and event processing
- **SNS Topics** for event routing
- **SES Configuration** for email tracking
- **AWS End User Messaging** integration (SMS)
- **IAM User & Access Keys** for application authentication
- **CloudWatch Monitoring** for operational visibility

---

## 📁 Files Overview

```
engageninja-terraform/
├── engageninja-terraform-main.tf        # Provider and Terraform config
├── engageninja-terraform-variables.tf   # Variable definitions
├── engageninja-terraform-sqs.tf         # SQS queues and DLQ
├── engageninja-terraform-sns.tf         # SNS topics and subscriptions
├── engageninja-terraform-ses.tf         # SES configuration set
├── engageninja-terraform-iam.tf         # IAM user and policies
├── engageninja-terraform-monitoring.tf  # CloudWatch logs and alarms
├── engageninja-terraform-outputs.tf     # Output values
├── terraform.tfvars.example             # Example variables file
├── TERRAFORM_SETUP_GUIDE.md             # Step-by-step setup guide
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

## 📋 What Gets Created

### SQS Queues
- `engageninja-outbound-messages-dev` - Outbound campaign messages
- `engageninja-sms-events-dev` - SMS delivery status events
- `engageninja-email-events-dev` - Email delivery/bounce/complaint events
- `engageninja-outbound-messages-dlq-dev` - Dead Letter Queue for failed messages

### SNS Topics
- `engageninja-sms-events-dev` - SMS events topic (receives from AWS End User Messaging)
- `engageninja-email-events-dev` - Email events topic (receives from SES)

### SES
- Configuration Set: `engageninja-email-events`
- Event Destination for bounce/complaint/delivery tracking

### IAM
- User: `engageninja-app-dev`
- Access Key ID & Secret (auto-generated)
- Policies for SQS, SNS, SES, SMS, CloudWatch Logs

### Monitoring
- CloudWatch Log Group: `/aws/engageninja/dev/app`
- CloudWatch Alarms for queue depth and DLQ messages

---

## 🔧 Configuration

### Environment Variables

Edit `terraform.tfvars` to customize:

```hcl
aws_region                     = "us-east-1"
environment                    = "dev"  # or "staging", "prod"
project_name                   = "engageninja"
sqs_message_retention_seconds  = 1209600  # 14 days
sqs_visibility_timeout_seconds = 300      # 5 minutes
ses_configuration_set_name     = "engageninja-email-events"
sms_sending_limit              = 1.0      # USD per month
enable_cloudwatch_logs         = true
log_retention_days             = 30

tags = {
  Environment = "dev"
  Project     = "EngageNinja"
  Team        = "Backend"
}
```

### Scaling for Production

For production deployment, update `terraform.tfvars`:

```hcl
environment                    = "prod"
sqs_message_retention_seconds  = 604800  # 7 days
sqs_visibility_timeout_seconds = 600     # 10 minutes for slower processors
log_retention_days             = 90
enable_cloudwatch_logs         = true

tags = {
  Environment = "prod"
  Project     = "EngageNinja"
  CostCenter  = "Product"
}
```

---

## 📊 Architecture

```
EngageNinja Node.js App
       │
       ├─→ Campaign Creation
       │   └─→ SQS: Outbound Messages Queue
       │       └─→ Message Processor
       │           ├─→ Send via WhatsApp (Meta API)
       │           ├─→ Send via Email (SES)
       │           └─→ Send via SMS (AWS End User Messaging)
       │
       └─→ Status Updates (Webhooks from providers)
           ├─→ SNS: SMS Events Topic ─→ SQS: SMS Events Queue
           ├─→ SNS: Email Events Topic ─→ SQS: Email Events Queue
           └─→ Message Processor: Update message status in DB

CloudWatch:
  - Logs: Application logs
  - Alarms: Queue depth, DLQ messages, SES bounce rate
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
SQS_OUTBOUND_MESSAGES_URL=https://sqs.us-east-1.amazonaws.com/...
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
    QueueUrl: process.env.SQS_OUTBOUND_MESSAGES_URL,
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
- SMS: Send SMS messages
- CloudWatch Logs: Write logs

---

## 🧪 Testing

### Test SQS
```bash
# Send test message
aws sqs send-message \
  --queue-url $SQS_OUTBOUND_MESSAGES_URL \
  --message-body '{"test":true}' \
  --region us-east-1

# Receive messages
aws sqs receive-message \
  --queue-url $SQS_OUTBOUND_MESSAGES_URL \
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
- Check SQS_OUTBOUND_MESSAGES_URL is correct

---
## 📖 Documentation

- [Complete Setup Guide](./TERRAFORM_SETUP_GUIDE.md)
- [AWS SQS Documentation](https://docs.aws.amazon.com/sqs/)
- [AWS SNS Documentation](https://docs.aws.amazon.com/sns/)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [AWS End User Messaging](https://docs.aws.amazon.com/sms-voice/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)

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

Run `./destroy-complete.sh` from this directory after your tests to execute `terraform destroy` and clean up the AWS Pinpoint (configuration set, protect configuration, phone pool if provided) and SES configuration set in one go. Override `PROJECT_NAME`, `ENVIRONMENT`, `SES_CONFIGURATION_SET_NAME`, or `SMS_POOL_ID` via environment variables when you deployed with custom names.

---

**Created:** December 2025  
**Maintainer:** EngageNinja Team  
**License:** MIT
