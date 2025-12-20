# ============================================================================
# Summary Outputs (convenient reference for application configuration)
# ============================================================================

output "environment_summary" {
  description = "Summary of deployed environment"
  value = {
    environment  = var.environment
    region       = var.aws_region
    project_name = var.project_name
  }
}

output "application_configuration" {
  description = "Configuration needed for Node.js application (in ECS/Fargate)"
  value = {
    # AWS Credentials (pass as environment variables to ECS task)
    AWS_ACCESS_KEY_ID     = "*** Set from Terraform output (see secrets) ***"
    AWS_SECRET_ACCESS_KEY = "*** Set from Terraform output (see secrets) ***"
    AWS_REGION            = var.aws_region

    # SQS Configuration
    SQS_OUTBOUND_MESSAGES_URL = aws_sqs_queue.outbound_messages.url
    SQS_SMS_EVENTS_URL        = aws_sqs_queue.sms_events.url
    SQS_EMAIL_EVENTS_URL      = aws_sqs_queue.email_events.url
    SQS_DLQ_URL               = aws_sqs_queue.outbound_messages_dlq.url

    # SNS Configuration
    SNS_SMS_EVENTS_TOPIC_ARN   = aws_sns_topic.sms_events.arn
    SNS_EMAIL_EVENTS_TOPIC_ARN = aws_sns_topic.email_events.arn

    # SES Configuration
    SES_CONFIGURATION_SET = aws_ses_configuration_set.main.name

    # CloudWatch
    CLOUDWATCH_LOG_GROUP = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.app[0].name : "disabled"
  }

  sensitive = false
}

output "sensitive_credentials" {
  description = "SENSITIVE: AWS credentials for application (store in AWS Secrets Manager or environment variables)"
  value = {
    AWS_ACCESS_KEY_ID     = aws_iam_access_key.app.id
    AWS_SECRET_ACCESS_KEY = aws_iam_access_key.app.secret
    AWS_REGION            = var.aws_region
  }

  sensitive = true
}

output "infrastructure_arns" {
  description = "ARNs of all created resources (for reference and troubleshooting)"
  value = {
    sqs = {
      outbound_messages = aws_sqs_queue.outbound_messages.arn
      sms_events        = aws_sqs_queue.sms_events.arn
      email_events      = aws_sqs_queue.email_events.arn
      dlq               = aws_sqs_queue.outbound_messages_dlq.arn
    }
    sns = {
      sms_events   = aws_sns_topic.sms_events.arn
      email_events = aws_sns_topic.email_events.arn
    }
    iam = {
      user = aws_iam_user.app.arn
    }
  }

  sensitive = false
}

# ============================================================================
# Post-Deployment Instructions (helpful for user)
# ============================================================================

output "next_steps" {
  description = "Next steps to complete the setup"
  value       = <<-EOT
    ✅ Terraform infrastructure created successfully!

    📋 NEXT STEPS:

    1. Save AWS Credentials to Secrets Manager or your .env file:
       - AWS_ACCESS_KEY_ID: ${aws_iam_access_key.app.id}
       - AWS_SECRET_ACCESS_KEY: (use sensitive output below)
       - AWS_REGION: ${var.aws_region}

    2. Verify SES Sender Identity (required to send emails):
       - Go to AWS SES console → Verified Identities
       - Add your sender email (e.g., noreply@yourdomain.com)
       - Click verification link in email you receive

    3. Configure SES to use the Configuration Set:
       - All emails sent via AWS SDK should use ConfigurationSet: "${aws_ses_configuration_set.main.name}"

    4. Set up SMS phone pools in AWS End User Messaging:
       - AWS Console → End User Messaging → SMS
       - Create phone number pool
       - Request production access (currently in sandbox)

    5. Configure your Node.js application with SQS URLs:
       - Outbound messages: ${aws_sqs_queue.outbound_messages.url}
       - SMS events: ${aws_sqs_queue.sms_events.url}
       - Email events: ${aws_sqs_queue.email_events.url}

    6. Update your messageQueue.js to use SQS instead of polling:
       - Send messages to outbound SQS queue
       - Poll SMS/email events queues for status updates

    7. Monitor CloudWatch logs:
       - Log group: /aws/engageninja/${var.environment}/app
       - CloudWatch Alarms configured for queue depth and DLQ

    📚 Documentation:
       - AWS SQS: https://docs.aws.amazon.com/sqs/
       - AWS SNS: https://docs.aws.amazon.com/sns/
       - AWS End User Messaging: https://docs.aws.amazon.com/sms-voice/
       - AWS SES: https://docs.aws.amazon.com/ses/

    ❓ Troubleshooting:
       - Check IAM permissions if access denied errors
       - Review CloudWatch logs for application errors
       - Verify SES sender identity is verified
       - Confirm SNS topics have correct queue subscriptions
  EOT

  sensitive = false
}
