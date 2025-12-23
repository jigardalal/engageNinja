# EngageNinja Terraform Infrastructure Setup Guide

## Overview

This Terraform configuration provisions the AWS infrastructure for EngageNinja's messaging system:
- **SQS Queues** for outbound messages and event processing
- **SNS Topics** for SMS and email event routing
- **SES Configuration Set** for email tracking
- **IAM User & Access Keys** for application authentication
- **CloudWatch Monitoring** for infrastructure health

---

## Prerequisites

1. **AWS Account** - You must be logged in as root user or have appropriate IAM permissions
2. **Terraform** - Install Terraform CLI (v1.0+)
   ```bash
   # macOS
   brew install terraform

   # Linux
   curl -fsSL https://apt.terraform.io/apt.gpg | sudo apt-key add -
   sudo apt-add-repository "deb https://apt.terraform.io $(lsb_release -cs) main"
   sudo apt-get update && sudo apt-get install terraform

   # Verify installation
   terraform version
   ```

3. **AWS CLI** - Optional but helpful
   ```bash
   pip install awscli
   aws --version
   ```

---

## Step 1: Set Up AWS Credentials

Terraform needs AWS credentials to authenticate. You have two options:

### Option A: AWS Credentials File (Recommended for local development)
```bash
# Create ~/.aws/credentials file
mkdir -p ~/.aws

cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY

[engageninja]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF

chmod 600 ~/.aws/credentials

# Create ~/.aws/config file
cat > ~/.aws/config << EOF
[default]
region = us-east-1

[profile engageninja]
region = us-east-1
EOF
```

### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_REGION="us-east-1"
```

### Option C: AWS SSO (for production)
```bash
aws sso login --profile engageninja
```

---

## Step 2: Create terraform.tfvars File

```bash
# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**Example terraform.tfvars:**
```hcl
aws_region  = "us-east-1"
environment = "dev"
project_name = "engageninja"
iam_user_name = "engageninja-app"
sqs_message_retention_seconds = 1209600
sqs_visibility_timeout_seconds = 300
ses_configuration_set_name = "engageninja-email-events"
enable_cloudwatch_logs = true
log_retention_days = 30

tags = {
  Environment = "dev"
  Team        = "Backend"
  Project     = "EngageNinja"
}
```

---

## Step 3: Initialize Terraform

```bash
# Initialize working directory (downloads AWS provider)
terraform init

# Expected output:
# Terraform has been successfully configured!
```

---

## Step 4: Plan Infrastructure Changes

```bash
# Create and review the execution plan
terraform plan -out=tfplan

# This will show:
# - Resources to be created (SQS queues, SNS topics, etc.)
# - IAM user and policies
# - CloudWatch alarms and logs
```

**Sample output:**
```
Plan: 23 to add, 0 to change, 0 to destroy.
```

---

## Step 5: Apply Infrastructure

```bash
# Apply the plan (create all resources)
terraform apply tfplan

# OR apply without saving a plan
terraform apply

# Type "yes" to confirm
```

**This will:**
- Create 3 SQS queues (outbound, SMS events, email events, DLQ)
- Create 2 SNS topics (SMS events, email events)
- Create SNS→SQS subscriptions
- Create SES configuration set
- Create IAM user and attach policies
- Generate AWS access keys
- Set up CloudWatch logs and alarms

---

## Step 6: Retrieve Outputs (Credentials & Configuration)

```bash
# Show all outputs
terraform output

# Show specific sensitive output (credentials)
terraform output -json sensitive_credentials

# Save credentials to a file (for your .env)
terraform output -json sensitive_credentials > credentials.json

# Parse individual values
terraform output iam_access_key_id
terraform output -raw iam_secret_access_key
```

**Sample output:**
```
application_configuration = {
  AWS_REGION = "us-east-1"
  AWS_ACCESS_KEY_ID = "AKIA..."
  SQS_MESSAGES_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/engageninja-messages-dev"
  SQS_SMS_EVENTS_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/engageninja-sms-events-dev"
  SQS_EMAIL_EVENTS_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/engageninja-email-events-dev"
  SNS_SMS_EVENTS_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:engageninja-sms-events-dev"
  SNS_EMAIL_EVENTS_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:engageninja-email-events-dev"
  SES_CONFIGURATION_SET = "engageninja-email-events"
  CLOUDWATCH_LOG_GROUP = "/aws/engageninja/dev/app"
}
```

---

## Step 7: Configure Your Node.js Application

Add the SQS and SNS URLs to your `.env` file:

```bash
# .env (in your Node.js application)

# AWS Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# SQS Queues
SQS_MESSAGES_URL=https://sqs.us-east-1.amazonaws.com/123456789012/engageninja-messages-dev
SQS_SMS_EVENTS_URL=https://sqs.us-east-1.amazonaws.com/123456789012/engageninja-sms-events-dev
SQS_EMAIL_EVENTS_URL=https://sqs.us-east-1.amazonaws.com/123456789012/engageninja-email-events-dev
SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/123456789012/engageninja-messages-dlq-dev

# SNS Topics
SNS_SMS_EVENTS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:engageninja-sms-events-dev
SNS_EMAIL_EVENTS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:engageninja-email-events-dev

# SES Configuration
SES_CONFIGURATION_SET=engageninja-email-events
SES_REGION=us-east-1

# Verified sender email (must be verified in SES console)
SES_FROM_EMAIL=noreply@yourdomain.com

```

---

## Step 8: Verify SES Sender Identity

**Before you can send emails via SES, you must verify a sender email address:**

```bash
# AWS Console method:
# 1. Go to AWS Console → SES
# 2. Click "Verified Identities" → "Create Identity"
# 3. Select "Email address"
# 4. Enter your sender email (e.g., noreply@yourdomain.com)
# 5. Check your email for verification link
# 6. Click the link to confirm

# Or via AWS CLI:
aws ses verify-email-identity \
  --email-address noreply@yourdomain.com \
  --region us-east-1

# Check verification status:
aws ses get-identity-verification-attributes \
  --identities noreply@yourdomain.com \
  --region us-east-1
```

---

---

## Step 10: Test the Setup

### Test SQS
```bash
# Send a test message to outbound queue
aws sqs send-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/engageninja-messages-dev \
  --message-body '{"type":"test","message":"Hello"}' \
  --region us-east-1

# Receive messages
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/engageninja-messages-dev \
  --region us-east-1
```

### Test SES
```bash
# Send a test email
aws ses send-email \
  --from noreply@yourdomain.com \
  --to recipient@example.com \
  --subject "Test Email" \
  --text "This is a test email from EngageNinja" \
  --region us-east-1
```

---

## Cleanup (Destroy Infrastructure)

If you need to remove all resources:

```bash
# Review what will be destroyed
terraform plan -destroy

# Destroy all resources
terraform destroy

# Type "yes" to confirm
```

⚠️ **Warning:** This deletes all SQS queues, SNS topics, and IAM users. Any messages in the queues will be lost.

---

## Troubleshooting

### Error: "InvalidParameterException: Invalid request provided"
- Check AWS credentials are valid
- Verify IAM user has required permissions
- Check region is correct (us-east-1)

### Error: "User is not authorized to perform: sqs:CreateQueue"
- The IAM user/credentials don't have SQS permissions
- Create new credentials with admin access for initial setup
- Or add SQS policy to existing user

### Error: "The security token included in the request is invalid"
- AWS credentials expired or invalid
- Refresh credentials in ~/.aws/credentials

### Terraform State Lock
If you see "Error: Error acquiring the lock", another Terraform process is running:
```bash
# Force unlock (use with caution)
terraform force-unlock LOCK_ID
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   EngageNinja Node.js App                   │
│                     (ECS Fargate)                           │
└──────────┬──────────────────────────────────────────────────┘
           │
       Uses AWS SDK with credentials (from IAM User)
           │
    ┌──────┴──────┐
    │             │
    v             v
┌─────────┐   ┌──────────┐
│   SQS   │   │   SNS    │
│ Queues  │   │  Topics  │
└────┬────┘   └────┬─────┘
     │             │
     │    ┌────────┴────────┐
     │    │                 │
     v    v                 v
  ┌──────┐  ┌──────┐  ┌──────────────┐
  │ SES  │  │ SMS  │  │  Webhooks    │
  │Email │  │Voice │  │ (Callbacks)  │
  └──────┘  └──────┘  └──────────────┘
```

---

## Security Best Practices

1. **Never commit credentials** to version control
2. **Rotate IAM access keys** every 90 days
3. **Use Secrets Manager** for sensitive data in production
4. **Enable CloudTrail** to audit API calls
5. **Restrict queue access** to specific VPC/security groups
6. **Encrypt SNS topics** at rest (enabled by default)
7. **Use HTTPS** for all SQS and SNS connections

---

## Next Steps

1. Update your `messageQueue.js` to use SQS instead of polling
2. Add error handling for SQS/SNS failures
3. Set up CloudWatch alarms for production monitoring
4. Create a backup Terraform state strategy (remote S3 backend)
5. Document any manual configurations (verified SES identities, SMS phone pools)

---

## Support

For issues or questions:
- Terraform docs: https://www.terraform.io/docs/
- AWS CLI docs: https://docs.aws.amazon.com/cli/
- AWS SQS docs: https://docs.aws.amazon.com/sqs/
- AWS SNS docs: https://docs.aws.amazon.com/sns/
