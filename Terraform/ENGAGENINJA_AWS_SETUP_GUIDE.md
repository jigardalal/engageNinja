# EngageNinja AWS Infrastructure Setup Guide

**Deployment Date:** December 19, 2025
**Status:** ✅ Production-Ready Infrastructure Deployed
**AWS Account ID:** 433088583514
**Region:** us-east-1
**Environment:** dev

---

## 📋 Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [AWS Credentials Configuration](#aws-credentials-configuration)
3. [Infrastructure Overview](#infrastructure-overview)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [SQS Queue Configuration](#sqs-queue-configuration)
6. [SNS Topic Configuration](#sns-topic-configuration)
7. [Node.js Environment Variables](#nodejs-environment-variables)
8. [Next Steps](#next-steps)
9. [Troubleshooting](#troubleshooting)
10. [Production Migration](#production-migration-checklist)

---

## Prerequisites & Setup

### 1. Install Terraform

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

### 2. Install AWS CLI (Optional but Recommended)

```bash
pip install awscli
aws --version
```

---

## AWS Credentials Configuration

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

### EngageNinja IAM User

- **Username:** `engageninja-app-dev`
- **Access Key ID:** `[REDACTED]`
- **Secret Access Key:** `[REDACTED]`

⚠️ **SECURITY WARNING:** Store credentials securely:
- Never commit to git
- Use AWS Secrets Manager or environment variables
- Rotate keys every 90 days in production
- Use IAM role (not access keys) when deploying to ECS Fargate

### Permissions Attached

The IAM user has the following policies:
- ✅ SQS (send, receive, delete messages)
- ✅ SNS (publish to topics)
- ✅ SES (send emails, get configuration)
- ✅ CloudWatch Logs (write application logs)

---

## Infrastructure Overview

### Architecture Flow

```
Your Application
    ↓
SQS: engageninja-messages-dev (campaign messages)
    ↓
Worker Process (poll & send)
    ├→ WhatsApp (Meta Cloud API)
    ├→ Email (AWS SES)
    └→ SMS (Twilio or other provider)
    ↓
SNS Topics (events from providers)
    ├→ engageninja-email-events-dev (SES bounce/delivery/complaint)
    └→ engageninja-sms-events-dev (SMS delivery status)
    ↓
SQS Event Queues (subscribe to SNS)
    ├→ engageninja-email-events-dev (email events)
    └→ engageninja-sms-events-dev (SMS events)
    ↓
Worker Process (poll events & update DB)
    ↓
Database (update message status)
```

---

## Step-by-Step Deployment

### Step 1: Create terraform.tfvars File

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

### Step 2: Initialize Terraform

```bash
# Initialize working directory (downloads AWS provider)
terraform init

# Expected output:
# Terraform has been successfully configured!
```

### Step 3: Plan Infrastructure Changes

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

### Step 4: Apply Infrastructure

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

### Step 5: Retrieve Outputs (Credentials & Configuration)

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

### Step 6: Cleanup (Destroy Infrastructure)

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

## SQS Queue Configuration

### Outbound Messages Queue

- **URL:** `https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-messages-dev`
- **ARN:** `arn:aws:sqs:us-east-1:433088583514:engageninja-messages-dev`
- **Purpose:** Campaigns send messages here
- **Max Message Size:** 256 KB
- **Message Retention:** 14 days
- **Visibility Timeout:** 300 seconds (5 minutes)
- **Dead Letter Queue:** engageninja-messages-dlq-dev (after 5 failed attempts)

### Email Events Queue

- **URL:** `https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-email-events-dev`
- **ARN:** `arn:aws:sqs:us-east-1:433088583514:engageninja-email-events-dev`
- **Purpose:** Receive email delivery/bounce/complaint events from SNS
- **Max Message Size:** 256 KB
- **Message Retention:** 14 days
- **Visibility Timeout:** 300 seconds

### SMS Events Queue

- **URL:** `https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-sms-events-dev`
- **ARN:** `arn:aws:sqs:us-east-1:433088583514:engageninja-sms-events-dev`
- **Purpose:** Receive SMS delivery status events from SNS
- **Max Message Size:** 256 KB
- **Message Retention:** 14 days
- **Visibility Timeout:** 300 seconds

-### Dead Letter Queue (DLQ)

- **URL:** `https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-messages-dlq-dev`
- **ARN:** `arn:aws:sqs:us-east-1:433088583514:engageninja-messages-dlq-dev`
- **Purpose:** Failed messages after 5 retries
- **Message Retention:** 14 days (for debugging)
- **Monitoring:** CloudWatch alarm triggers when DLQ has messages

### SQS Usage in Node.js

```javascript
const AWS = require('aws-sdk');
const sqs = new AWS.SQS({
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Send message to outbound queue
await sqs.sendMessage({
  QueueUrl: process.env.SQS_MESSAGES_URL,
  MessageBody: JSON.stringify({
    campaignId: 'campaign-123',
    contactId: 'contact-456',
    channel: 'whatsapp',
    provider: 'whatsapp_cloud',
    template: 'welcome_message',
    variables: { name: 'John' }
  })
}).promise();

// Poll email events queue
setInterval(async () => {
  const messages = await sqs.receiveMessage({
    QueueUrl: process.env.SQS_EMAIL_EVENTS_URL,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20  // Long polling
  }).promise();
  
  if (messages.Messages) {
    for (const msg of messages.Messages) {
      // Process event
      const event = JSON.parse(msg.Body);
      console.log('Email event:', event);
      
      // Delete message after processing
      await sqs.deleteMessage({
        QueueUrl: process.env.SQS_EMAIL_EVENTS_URL,
        ReceiptHandle: msg.ReceiptHandle
      }).promise();
    }
  }
}, 5000);
```

---

## SNS Topic Configuration

### Email Events Topic

- **Name:** `engageninja-email-events-dev`
- **ARN:** `arn:aws:sns:us-east-1:433088583514:engageninja-email-events-dev`
- **Purpose:** SES publishes email delivery/bounce/complaint events
- **Subscription:** Connected to SQS email-events queue (raw message delivery)
- **Encryption:** AWS managed (alias/aws/sns)

### SMS Events Topic

- **Name:** `engageninja-sms-events-dev`
- **ARN:** `arn:aws:sns:us-east-1:433088583514:engageninja-sms-events-dev`
- **Purpose:** Captures SMS/WhatsApp delivery status events from your provider
- **Subscription:** Connected to SQS sms-events queue (raw message delivery)
- **Encryption:** AWS managed (alias/aws/sns)

---

## Node.js Environment Variables

Create a `.env` file in your backend directory with these variables:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=[REDACTED]
AWS_SECRET_ACCESS_KEY=[REDACTED]
AWS_REGION=us-east-1

# SQS Queue URLs
SQS_MESSAGES_URL=https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-messages-dev
SQS_SMS_EVENTS_URL=https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-sms-events-dev
SQS_EMAIL_EVENTS_URL=https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-email-events-dev
SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-messages-dlq-dev

# SNS Topic ARNs
SNS_SMS_EVENTS_TOPIC_ARN=arn:aws:sns:us-east-1:433088583514:engageninja-sms-events-dev
SNS_EMAIL_EVENTS_TOPIC_ARN=arn:aws:sns:us-east-1:433088583514:engageninja-email-events-dev

# SES Configuration
SES_CONFIGURATION_SET=engageninja-email-events
SES_REGION=us-east-1

# CloudWatch Logs
CLOUDWATCH_LOG_GROUP=/aws/engageninja/dev/app
CLOUDWATCH_LOG_STREAM=application

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
PORT=5000
```

**⚠️ Security Reminder:**
- Never commit `.env` to git
- Add `.env` to `.gitignore`
- Use AWS Secrets Manager or IAM roles in production
- Rotate credentials every 90 days

---

## Next Steps

### 1. Verify SES Sender Email (Required for Email Sending)

Before you can send emails via SES, verify your sender email address:

```bash
aws ses verify-email-identity \
  --email-address noreply@yourdomain.com \
  --region us-east-1
```

Check your email inbox for AWS verification link and click it.

**Verify in AWS Console:**
```
AWS Console → SES → Verified Identities
Should show: noreply@yourdomain.com with Status: Verified
```

### 2. Request SES Production Access

Currently, your SES account is in **sandbox mode**, which means:
- ✅ Can send to verified email addresses
- ✅ Can send up to 1 email per second
- ✅ Can send 200 emails per 24 hours
- ❌ Cannot send to arbitrary recipients

**To request production access:**

1. Go to AWS Console → SES → Account dashboard
2. Click "Request production access"
3. Fill out the form:
   - Use case: "Transactional email notifications for EngageNinja"
   - Website: your website URL
   - Additional context: "Sending customer engagement campaigns"
4. AWS will review (usually same day)
5. Once approved, you can send to any recipient

### 3. Update Node.js messageQueue.js

Replace polling-based approach with SQS:

```javascript
const AWS = require('aws-sdk');

const sqs = new AWS.SQS({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Send campaign messages to SQS
async function queueCampaignMessage(message) {
  try {
    const result = await sqs.sendMessage({
      QueueUrl: process.env.SQS_MESSAGES_URL,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        Channel: {
          StringValue: message.channel,
          DataType: 'String'
        },
        Provider: {
          StringValue: message.provider,
          DataType: 'String'
        }
      }
    }).promise();
    
    console.log('Message queued:', result.MessageId);
    return result.MessageId;
  } catch (error) {
    console.error('Failed to queue message:', error);
    throw error;
  }
}

// Poll outbound messages and send
async function pollOutboundMessages() {
  while (true) {
    try {
      const messages = await sqs.receiveMessage({
        QueueUrl: process.env.SQS_MESSAGES_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        VisibilityTimeout: 300
      }).promise();
      
      if (messages.Messages) {
        for (const msg of messages.Messages) {
          const message = JSON.parse(msg.Body);
          
          try {
            // Send via provider
            await sendMessage(message);
            
            // Delete message from queue on success
            await sqs.deleteMessage({
              QueueUrl: process.env.SQS_MESSAGES_URL,
              ReceiptHandle: msg.ReceiptHandle
            }).promise();
          } catch (error) {
            console.error('Failed to send message:', error);
            // Message will be retried after VisibilityTimeout
          }
        }
      }
    } catch (error) {
      console.error('Error polling outbound queue:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Poll email events and update database
async function pollEmailEvents() {
  while (true) {
    try {
      const messages = await sqs.receiveMessage({
        QueueUrl: process.env.SQS_EMAIL_EVENTS_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20
      }).promise();
      
      if (messages.Messages) {
        for (const msg of messages.Messages) {
          const event = JSON.parse(msg.Body);
          
          try {
            // Update message status in database
            await updateMessageStatus(event);
            
            // Delete message after processing
            await sqs.deleteMessage({
              QueueUrl: process.env.SQS_EMAIL_EVENTS_URL,
              ReceiptHandle: msg.ReceiptHandle
            }).promise();
          } catch (error) {
            console.error('Failed to process email event:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error polling email events:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Start workers
pollOutboundMessages().catch(console.error);
pollEmailEvents().catch(console.error);
```

### 4. Install AWS SDK in Node.js

```bash
npm install aws-sdk
# or
npm install @aws-sdk/client-sqs @aws-sdk/client-ses
```

### 5. Monitor CloudWatch Logs

Your application logs are sent to CloudWatch:

```bash
# View logs in real-time
aws logs tail /aws/engageninja/dev/app --follow --region us-east-1
```

**CloudWatch Alarms are configured for:**
- ✅ Outbound message queue depth > 10,000 messages
- ✅ DLQ has messages (failed sends)
- ✅ SES bounce rate > 100 bounces per 5 minutes

---

## Troubleshooting

### SQS Access Denied

**Error:** `AccessDenied: User: arn:aws:iam::433088583514:user/engageninja-app-dev is not authorized`

**Solution:**
1. Verify credentials in `.env` file
2. Check IAM user has SQS policy attached: `engageninja-sqs-policy-dev`
3. Verify queue URLs are correct

### SES Sending Failed

**Error:** `MessageRejected: Email address not verified`

**Solution:**
1. Verify sender email in SES console
2. Run: `aws ses verify-email-identity --email-address noreply@yourdomain.com --region us-east-1`
3. Check email inbox for verification link

### DLQ Messages Appear

**Means:** Messages failed to send after 5 retries

**Solution:**
1. Check CloudWatch logs for error messages
2. Verify provider credentials (WhatsApp, SES)
3. Check message format (phone numbers, content)
4. Delete messages from DLQ after fixing issues

### High Queue Depth

**Means:** Worker process is slower than message volume

**Solution:**
1. Scale worker to multiple processes
2. Increase MaxNumberOfMessages in receive call (up to 10)
3. Optimize send logic (reduce provider API calls)
4. Add more worker instances in ECS Fargate

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

## Testing the Setup

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

## Production Migration Checklist

- [ ] Request SES production access
- [ ] Coordinate with SMS/WhatsApp provider (Twilio) for production access (10DLC/TFN)
- [ ] Verify production domain in SES
- [ ] Rotate IAM access keys
- [ ] Move to AWS Secrets Manager or IAM roles
- [ ] Set up Terraform remote state (S3 backend)
- [ ] Configure CloudWatch log retention (30 days minimum)
- [ ] Set up SNS email notifications for alarms
- [ ] Test end-to-end message flow with real numbers
- [ ] Set up PagerDuty/Slack alerts for DLQ messages
- [ ] Document runbooks for common issues

---

## Support & Documentation

- **Terraform docs:** https://www.terraform.io/docs/
- **AWS CLI docs:** https://docs.aws.amazon.com/cli/
- **AWS SQS:** https://docs.aws.amazon.com/sqs/
- **AWS SNS:** https://docs.aws.amazon.com/sns/
- **AWS SES:** https://docs.aws.amazon.com/ses/
- **Twilio Messaging API:** https://www.twilio.com/docs/sms
- **AWS SDK for JavaScript:** https://docs.aws.amazon.com/sdk-for-javascript/

---

**Deployment completed:** December 19, 2025
**Last updated:** December 28, 2025
