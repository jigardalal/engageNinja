# ============================================================================
# IAM User for EngageNinja Application
# ============================================================================

resource "aws_iam_user" "app" {
  name = "${var.iam_user_name}-${var.environment}"

  tags = merge(
    var.tags,
    {
      Name        = var.iam_user_name
      Description = "IAM user for EngageNinja application to access AWS services"
    }
  )
}

# ============================================================================
# IAM Policies for Application Access
# ============================================================================

# Policy for SQS access (send, receive, delete messages)
resource "aws_iam_policy" "sqs_policy" {
  name        = "${var.project_name}-sqs-policy-${var.environment}"
  description = "Policy for EngageNinja app to send/receive/delete messages from SQS queues"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SendMessageToOutboundQueue"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = [
          aws_sqs_queue.messages.arn
        ]
      },
      {
        Sid    = "ReceiveAndDeleteFromQueues"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [
          aws_sqs_queue.sms_events.arn,
          aws_sqs_queue.email_events.arn,
          aws_sqs_queue.messages.arn,
          aws_sqs_queue.messages_dlq.arn
        ]
      },
      {
        Sid    = "GetQueueUrl"
        Effect = "Allow"
        Action = [
          "sqs:GetQueueUrl"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-sqs-policy"
    }
  )
}

# Policy for SNS access (publish messages for SMS/Email)
resource "aws_iam_policy" "sns_policy" {
  name        = "${var.project_name}-sns-policy-${var.environment}"
  description = "Policy for EngageNinja app to publish messages to SNS topics"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PublishToTopics"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          aws_sns_topic.sms_events.arn,
          aws_sns_topic.email_events.arn
        ]
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-sns-policy"
    }
  )
}

# Policy for SES access (send emails)
resource "aws_iam_policy" "ses_policy" {
  name        = "${var.project_name}-ses-policy-${var.environment}"
  description = "Policy for EngageNinja app to send emails via SES"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SendEmail"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      },
      {
        Sid    = "GetConfigurationSet"
        Effect = "Allow"
        Action = [
          "ses:GetConfigurationSet",
          "ses:DescribeConfigurationSet"
        ]
        Resource = [
          "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:configuration-set/${aws_ses_configuration_set.main.name}"
        ]
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-ses-policy"
    }
  )
}

# Policy for CloudWatch Logs (optional, for monitoring)
resource "aws_iam_policy" "cloudwatch_logs_policy" {
  count       = var.enable_cloudwatch_logs ? 1 : 0
  name        = "${var.project_name}-cloudwatch-logs-policy-${var.environment}"
  description = "Policy for EngageNinja app to write logs to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CreateAndPutLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "${aws_cloudwatch_log_group.app[0].arn}:*"
        ]
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-cloudwatch-logs-policy"
    }
  )
}

# ============================================================================
# Attach Policies to IAM User
# ============================================================================

resource "aws_iam_user_policy_attachment" "sqs" {
  user       = aws_iam_user.app.name
  policy_arn = aws_iam_policy.sqs_policy.arn
}

resource "aws_iam_user_policy_attachment" "sns" {
  user       = aws_iam_user.app.name
  policy_arn = aws_iam_policy.sns_policy.arn
}

resource "aws_iam_user_policy_attachment" "ses" {
  user       = aws_iam_user.app.name
  policy_arn = aws_iam_policy.ses_policy.arn
}

resource "aws_iam_user_policy_attachment" "cloudwatch_logs" {
  count      = var.enable_cloudwatch_logs ? 1 : 0
  user       = aws_iam_user.app.name
  policy_arn = aws_iam_policy.cloudwatch_logs_policy[0].arn
}

# ============================================================================
# IAM Access Keys (for AWS SDK authentication)
# ============================================================================

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# Data Sources
# ============================================================================

data "aws_caller_identity" "current" {}

# ============================================================================
# IAM Outputs
# ============================================================================

output "iam_user_name" {
  description = "IAM user name for the application"
  value       = aws_iam_user.app.name
}

output "iam_access_key_id" {
  description = "AWS Access Key ID for the application"
  value       = aws_iam_access_key.app.id
  sensitive   = true
}

output "iam_secret_access_key" {
  description = "AWS Secret Access Key for the application (store securely)"
  value       = aws_iam_access_key.app.secret
  sensitive   = true
}

output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
  sensitive   = false
}
