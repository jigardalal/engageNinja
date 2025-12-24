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
    SQS_MESSAGES_URL     = aws_sqs_queue.messages.url
    SQS_SMS_EVENTS_URL   = aws_sqs_queue.sms_events.url
    SQS_EMAIL_EVENTS_URL = aws_sqs_queue.email_events.url
    SQS_DLQ_URL          = aws_sqs_queue.messages_dlq.url

    # RDS Configuration
    DATABASE_URL           = local.database_url
    POSTGRES_ENDPOINT      = aws_db_instance.postgres.endpoint
    POSTGRES_PORT          = aws_db_instance.postgres.port
    TWILIO_WEBHOOK_URL     = "${aws_apigatewayv2_stage.default.invoke_url}webhooks/twilio"
    TWILIO_WEBHOOK_SMS_URL = "${aws_apigatewayv2_stage.default.invoke_url}webhooks/twilio/sms"
    METRICS_ENDPOINT       = local.metrics_endpoint

    # SNS Configuration
    SNS_SMS_EVENTS_TOPIC_ARN   = aws_sns_topic.sms_events.arn
    SNS_EMAIL_EVENTS_TOPIC_ARN = aws_sns_topic.email_events.arn

    # SES Configuration
    SES_CONFIGURATION_SET = aws_ses_configuration_set.main.name

    # CloudWatch
    CLOUDWATCH_LOG_GROUP = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.app[0].name : "disabled"
  }

  sensitive = true
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
      outbound_messages = aws_sqs_queue.messages.arn
      sms_events        = aws_sqs_queue.sms_events.arn
      email_events      = aws_sqs_queue.email_events.arn
      dlq               = aws_sqs_queue.messages_dlq.arn
    }
    sns = {
      sms_events   = aws_sns_topic.sms_events.arn
      email_events = aws_sns_topic.email_events.arn
    }
    iam = {
      user = aws_iam_user.app.arn
    }
  }

  sensitive = true
}

# ============================================================================
# Post-Deployment Instructions (helpful for user)
# ============================================================================

# ============================================================================
# Complete Resource Index (with AWS console links)
# ============================================================================

output "resource_index" {
  description = "Complete index of all created AWS resources with console links"
  value = {
    rds = {
      instance_id = aws_db_instance.postgres.identifier
      endpoint    = aws_db_instance.postgres.endpoint
      console_url = "https://console.aws.amazon.com/rds/home?region=${var.aws_region}#database:id=${aws_db_instance.postgres.identifier}"
    }

    vpc = {
      vpc_id      = aws_vpc.managed[0].id
      console_url = "https://console.aws.amazon.com/ec2/v2/home?region=${var.aws_region}#VPCs:"
    }

    subnets = {
      subnet_1_id = aws_subnet.managed[0].id
      subnet_2_id = aws_subnet.managed[1].id
      console_url = "https://console.aws.amazon.com/ec2/v2/home?region=${var.aws_region}#Subnets:"
    }

    security_groups = {
      postgres_sg_id  = aws_security_group.postgres.id
      console_url     = "https://console.aws.amazon.com/ec2/v2/home?region=${var.aws_region}#SecurityGroups:"
    }

    internet_gateway = {
      igw_id      = aws_internet_gateway.managed[0].id
      console_url = "https://console.aws.amazon.com/ec2/v2/home?region=${var.aws_region}#InternetGateways:"
    }

    lambda_functions = {
      send_campaign = {
        function_name = aws_lambda_function.send_campaign.function_name
        arn           = aws_lambda_function.send_campaign.arn
        console_url   = "https://console.aws.amazon.com/lambda/home?region=${var.aws_region}#/functions/${aws_lambda_function.send_campaign.function_name}"
      }
      update_status = {
        function_name = aws_lambda_function.update_message_status.function_name
        arn           = aws_lambda_function.update_message_status.arn
        console_url   = "https://console.aws.amazon.com/lambda/home?region=${var.aws_region}#/functions/${aws_lambda_function.update_message_status.function_name}"
      }
      twilio_webhook = {
        function_name = aws_lambda_function.twilio_webhook.function_name
        arn           = aws_lambda_function.twilio_webhook.arn
        console_url   = "https://console.aws.amazon.com/lambda/home?region=${var.aws_region}#/functions/${aws_lambda_function.twilio_webhook.function_name}"
      }
    }

    api_gateway = {
      api_id      = aws_apigatewayv2_api.webhooks.id
      api_name    = aws_apigatewayv2_api.webhooks.name
      invoke_url  = aws_apigatewayv2_stage.default.invoke_url
      console_url = "https://console.aws.amazon.com/apigateway/main/apis/${aws_apigatewayv2_api.webhooks.id}/routes?region=${var.aws_region}"
    }

    sqs_queues = {
      messages = {
        queue_name  = aws_sqs_queue.messages.name
        queue_url   = aws_sqs_queue.messages.url
        queue_arn   = aws_sqs_queue.messages.arn
        console_url = "https://console.aws.amazon.com/sqs/v2/home?region=${var.aws_region}#/queues/${aws_sqs_queue.messages.url}"
      }
      sms_events = {
        queue_name  = aws_sqs_queue.sms_events.name
        queue_url   = aws_sqs_queue.sms_events.url
        queue_arn   = aws_sqs_queue.sms_events.arn
        console_url = "https://console.aws.amazon.com/sqs/v2/home?region=${var.aws_region}#/queues/${aws_sqs_queue.sms_events.url}"
      }
      email_events = {
        queue_name  = aws_sqs_queue.email_events.name
        queue_url   = aws_sqs_queue.email_events.url
        queue_arn   = aws_sqs_queue.email_events.arn
        console_url = "https://console.aws.amazon.com/sqs/v2/home?region=${var.aws_region}#/queues/${aws_sqs_queue.email_events.url}"
      }
      dlq = {
        queue_name  = aws_sqs_queue.messages_dlq.name
        queue_url   = aws_sqs_queue.messages_dlq.url
        queue_arn   = aws_sqs_queue.messages_dlq.arn
        console_url = "https://console.aws.amazon.com/sqs/v2/home?region=${var.aws_region}#/queues/${aws_sqs_queue.messages_dlq.url}"
      }
    }

    sns_topics = {
      sms_events = {
        topic_name  = aws_sns_topic.sms_events.name
        topic_arn   = aws_sns_topic.sms_events.arn
        console_url = "https://console.aws.amazon.com/sns/v3/home?region=${var.aws_region}#/topic/${aws_sns_topic.sms_events.arn}"
      }
      email_events = {
        topic_name  = aws_sns_topic.email_events.name
        topic_arn   = aws_sns_topic.email_events.arn
        console_url = "https://console.aws.amazon.com/sns/v3/home?region=${var.aws_region}#/topic/${aws_sns_topic.email_events.arn}"
      }
    }

    ses = {
      configuration_set_name = aws_ses_configuration_set.main.name
      console_url            = "https://console.aws.amazon.com/ses/home?region=${var.aws_region}#/configuration-sets"
    }

    eventbridge = {
      rule_name   = aws_cloudwatch_event_rule.mock_status_updates.name
      rule_arn    = aws_cloudwatch_event_rule.mock_status_updates.arn
      console_url = "https://console.aws.amazon.com/events/home?region=${var.aws_region}#/rules"
    }

    iam = {
      lambda_role_name = aws_iam_role.lambda_exec.name
      lambda_role_arn  = aws_iam_role.lambda_exec.arn
      app_user_name    = aws_iam_user.app.name
      app_user_arn     = aws_iam_user.app.arn
      console_url      = "https://console.aws.amazon.com/iamv2/home#/roles"
    }
  }

  sensitive = false
}

output "next_steps" {
  description = "Next steps to complete the setup"
  value       = <<-EOT
    ✅ Terraform infrastructure created successfully!

    🔍 VIEW ALL RESOURCES:
       To see all created AWS resources with direct console links, run:
       $ terraform output resource_index

       Or get it as JSON:
       $ terraform output -json resource_index

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

    4. Configure your SMS/WhatsApp provider (e.g., Twilio) so delivery status callbacks point to:
       - ${aws_apigatewayv2_stage.default.invoke_url}webhooks/twilio
       - ${aws_apigatewayv2_stage.default.invoke_url}webhooks/twilio/sms

    5. Configure your Node.js application with the new infrastructure:
       - DATABASE_URL: ${"postgresql://${var.db_username}:${urlencode(local.db_password)}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}?sslmode=require"}
       - SQS_MESSAGES_URL: ${aws_sqs_queue.messages.url}
       - SQS_SMS_EVENTS_URL: ${aws_sqs_queue.sms_events.url}
       - SQS_EMAIL_EVENTS_URL: ${aws_sqs_queue.email_events.url}
       - METRICS_ENDPOINT: ${var.backend_url}${var.metrics_callback_path}

    6. Deploy the Lambda stack (SendCampaignMessage, UpdateMessageStatus, Twilio webhook) and ensure they can reach the Postgres database and backend metrics endpoint.

    7. Monitor CloudWatch logs:
       - Log group: /aws/engageninja/${var.environment}/app
       - CloudWatch Alarms configured for queue depth and DLQ

    📚 Documentation:
       - AWS SQS: https://docs.aws.amazon.com/sqs/
       - AWS SNS: https://docs.aws.amazon.com/sns/
       - AWS SES: https://docs.aws.amazon.com/ses/
       - Twilio Messaging: https://www.twilio.com/docs/sms

    ❓ Troubleshooting:
       - Check IAM permissions if access denied errors
       - Review CloudWatch logs for application errors
       - Verify SES sender identity is verified
       - Confirm SNS topics have correct queue subscriptions
  EOT

  sensitive = true
}
