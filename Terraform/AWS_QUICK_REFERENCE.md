# EngageNinja AWS Quick Reference

## 🔑 AWS Credentials

```
Access Key ID:     [REDACTED]
Secret Access Key: [REDACTED]
Region:            us-east-1
Account ID:        [REDACTED]
```

## 📨 SQS Queue URLs

```
Outbound Messages:  https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-messages-dev
Email Events:       https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-email-events-dev
SMS Events:         https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-sms-events-dev
Dead Letter Queue:  https://sqs.us-east-1.amazonaws.com/433088583514/engageninja-messages-dlq-dev
```

## 📢 SNS Topic ARNs

```
Email Events: arn:aws:sns:us-east-1:433088583514:engageninja-email-events-dev
SMS Events:   arn:aws:sns:us-east-1:433088583514:engageninja-sms-events-dev
```

## 📧 SES Configuration

```
Configuration Set: engageninja-email-events
Region:           us-east-1
Status:           Sandbox (request production access)
```

## 📱 SMS Configuration

```
Pool ID:               pool-27b82c21158e4ec1a08c3cb7f8509603
Origination Identity:  +14255556395
Status:               Sandbox ($1/month limit)
```

## 📊 CloudWatch

```
Log Group: /aws/engageninja/dev/app
Alarms:    3 (queue depth, DLQ messages, SES bounce rate)
```

## 🚀 Next Steps

1. [ ] Add credentials to `.env` file
2. [ ] Verify SES sender email
3. [ ] Request SES production access
4. [ ] Update messageQueue.js to use SQS
5. [ ] Test end-to-end with sample message
6. [ ] Monitor CloudWatch logs

## 🔗 Important Links

- AWS Console: https://console.aws.amazon.com/
- SES Dashboard: https://console.aws.amazon.com/ses/
- SQS Queues: https://console.aws.amazon.com/sqs/
- CloudWatch Logs: https://console.aws.amazon.com/logs/
- Full Setup Guide: See ENGAGENINJA_AWS_SETUP_GUIDE.md
