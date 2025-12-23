# ============================================================================
# SQS Queues
# ============================================================================

# Main outbound message queue (WhatsApp, Email, SMS campaigns)
resource "aws_sqs_queue" "messages" {
  name                       = "${var.project_name}-messages-${var.environment}"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = var.sqs_message_retention_seconds
  receive_wait_time_seconds  = 0
  visibility_timeout_seconds = var.sqs_visibility_timeout_seconds

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-messages-${var.environment}"
      Service     = "SQS"
      Type        = "MessageQueue"
    }
  )
}

# Queue for SMS delivery events
resource "aws_sqs_queue" "sms_events" {
  name                       = "${var.project_name}-sms-events-${var.environment}"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = var.sqs_message_retention_seconds
  receive_wait_time_seconds  = 0
  visibility_timeout_seconds = var.sqs_visibility_timeout_seconds

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-sms-events-${var.environment}"
      Service     = "SQS"
      Type        = "EventQueue"
    }
  )
}

# Queue for Email delivery events
resource "aws_sqs_queue" "email_events" {
  name                       = "${var.project_name}-email-events-${var.environment}"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = var.sqs_message_retention_seconds
  receive_wait_time_seconds  = 0
  visibility_timeout_seconds = var.sqs_visibility_timeout_seconds

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-email-events-${var.environment}"
      Service     = "SQS"
      Type        = "EventQueue"
    }
  )
}

# Dead Letter Queue for failed messages
resource "aws_sqs_queue" "messages_dlq" {
  name                       = "${var.project_name}-messages-dlq-${var.environment}"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600
  visibility_timeout_seconds = var.sqs_visibility_timeout_seconds

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-messages-dlq-${var.environment}"
      Service     = "SQS"
      Type        = "DeadLetterQueue"
    }
  )
}

# Attach DLQ to main queue
resource "aws_sqs_queue_redrive_policy" "outbound_messages_dlq_policy" {
  queue_url = aws_sqs_queue.messages.url

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.messages_dlq.arn
    maxReceiveCount     = 5
  })
}

# ============================================================================
# SQS Queue Outputs
# ============================================================================

# Queue outputs
output "sqs_messages_url" {
  description = "URL of the outbound messages queue"
  value       = aws_sqs_queue.messages.url
}

output "sqs_messages_arn" {
  description = "ARN of the outbound messages queue"
  value       = aws_sqs_queue.messages.arn
}

output "sqs_sms_events_url" {
  description = "URL of the SMS events queue"
  value       = aws_sqs_queue.sms_events.url
}

output "sqs_sms_events_arn" {
  description = "ARN of the SMS events queue"
  value       = aws_sqs_queue.sms_events.arn
}

output "sqs_email_events_url" {
  description = "URL of the email events queue"
  value       = aws_sqs_queue.email_events.url
}

output "sqs_email_events_arn" {
  description = "ARN of the email events queue"
  value       = aws_sqs_queue.email_events.arn
}

output "sqs_outbound_messages_dlq_url" {
  description = "URL of the outbound messages DLQ"
  value       = aws_sqs_queue.messages_dlq.url
}

output "sqs_outbound_messages_dlq_arn" {
  description = "ARN of the outbound messages DLQ"
  value       = aws_sqs_queue.messages_dlq.arn
}
