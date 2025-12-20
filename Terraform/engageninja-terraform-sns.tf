# ============================================================================
# SNS Topics for Event Notifications
# ============================================================================

# Topic for SMS delivery events from AWS End User Messaging
resource "aws_sns_topic" "sms_events" {
  name              = "engageninja-sms-events-${var.environment}"
  display_name      = "EngageNinja SMS Events"
  kms_master_key_id = "alias/aws/sns"
}

# Topic for Email delivery events from SES
resource "aws_sns_topic" "email_events" {
  name              = "engageninja-email-events-${var.environment}"
  display_name      = "EngageNinja Email Events"
  kms_master_key_id = "alias/aws/sns"
}

# ============================================================================
# SNS Topic Policies (allow SES and SMS to publish)
# ============================================================================

resource "aws_sns_topic_policy" "sms_events_policy" {
  arn = aws_sns_topic.sms_events.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sms-voice.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.sms_events.arn
      }
    ]
  })
}

resource "aws_sns_topic_policy" "email_events_policy" {
  arn = aws_sns_topic.email_events.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = data.aws_caller_identity.current.account_id
        }
        Action = [
          "SNS:Publish",
          "SNS:GetTopicAttributes"
        ]
        Resource = aws_sns_topic.email_events.arn
      }
    ]
  })
}

# ============================================================================
# SNS to SQS Subscriptions
# ============================================================================

resource "aws_sns_topic_subscription" "sms_events_to_sqs" {
  topic_arn            = aws_sns_topic.sms_events.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.sms_events.arn
  raw_message_delivery = true
}

resource "aws_sns_topic_subscription" "email_events_to_sqs" {
  topic_arn            = aws_sns_topic.email_events.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.email_events.arn
  raw_message_delivery = true
}

# ============================================================================
# SNS Outputs
# ============================================================================

output "sns_sms_events_arn" {
  description = "ARN of the SMS events topic"
  value       = aws_sns_topic.sms_events.arn
}

output "sns_sms_events_name" {
  description = "Name of the SMS events topic"
  value       = aws_sns_topic.sms_events.name
}

output "sns_email_events_arn" {
  description = "ARN of the email events topic"
  value       = aws_sns_topic.email_events.arn
}

output "sns_email_events_name" {
  description = "Name of the email events topic"
  value       = aws_sns_topic.email_events.name
}
