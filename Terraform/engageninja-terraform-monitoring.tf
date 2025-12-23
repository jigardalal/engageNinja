# ============================================================================
# CloudWatch Log Group (optional, for application logging)
# ============================================================================

resource "aws_cloudwatch_log_group" "app" {
  count             = var.enable_cloudwatch_logs ? 1 : 0
  name              = "/aws/engageninja/${var.environment}/app"
  retention_in_days = var.log_retention_days

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-app-logs"
      Description = "CloudWatch logs for EngageNinja application"
    }
  )
}

# ============================================================================
# CloudWatch Alarms (optional, for monitoring)
# ============================================================================

# Alarm: SQS outbound messages queue depth too high
resource "aws_cloudwatch_metric_alarm" "sqs_outbound_queue_depth" {
  alarm_name          = "${var.project_name}-outbound-queue-depth-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300 # 5 minutes
  statistic           = "Average"
  threshold           = 10000 # Alert if more than 10k messages queued
  alarm_description   = "Alert when outbound messages queue has too many pending messages"
  alarm_actions       = [] # Add SNS topic ARN here for notifications

  dimensions = {
    QueueName = aws_sqs_queue.messages.name
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-outbound-queue-depth"
    }
  )
}

# Alarm: SQS DLQ has messages (indicates failures)
resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages" {
  alarm_name          = "${var.project_name}-dlq-messages-${var.environment}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 1 # Alert if any messages in DLQ
  alarm_description   = "Alert when failed messages arrive in DLQ"
  alarm_actions       = [] # Add SNS topic ARN here for notifications

  dimensions = {
    QueueName = aws_sqs_queue.messages_dlq.name
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-dlq-messages"
    }
  )
}

# Alarm: SES bounce rate too high
resource "aws_cloudwatch_metric_alarm" "ses_bounce_rate" {
  alarm_name          = "${var.project_name}-ses-bounce-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Bounce"
  namespace           = "AWS/SES"
  period              = 300
  statistic           = "Sum"
  threshold           = 100 # Alert if more than 100 bounces in 5 min
  alarm_description   = "Alert when SES bounce rate is too high"
  alarm_actions       = [] # Add SNS topic ARN here

  dimensions = {
    ConfigurationSet = aws_ses_configuration_set.main.name
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-ses-bounce-rate"
    }
  )
}

# ============================================================================
# AWS Resource Group (to view all tagged resources together)
# ============================================================================

resource "aws_resourcegroups_group" "engageninja" {
  name        = "${var.project_name}-all-resources-${var.environment}"
  description = "All EngageNinja resources in ${var.environment} environment"

  resource_query {
    query = jsonencode({
      ResourceTypeFilters = [
        "AWS::EC2::SecurityGroup",
        "AWS::EC2::VPC",
        "AWS::EC2::Subnet",
        "AWS::EC2::InternetGateway",
        "AWS::RDS::DBInstance",
        "AWS::Lambda::Function",
        "AWS::SQS::Queue",
        "AWS::SNS::Topic",
        "AWS::SES::ConfigurationSet",
        "AWS::Events::Rule",
        "AWS::ApiGatewayV2::Api",
        "AWS::CloudWatch::Alarm"
      ]
      TagFilters = [
        {
          Key    = "Project"
          Values = [var.tags["Project"]]
        }
      ]
    })
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-resource-group"
      Description = "AWS Resource Group for all EngageNinja infrastructure"
    }
  )
}

# ============================================================================
# CloudWatch Outputs
# ============================================================================

output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name for application logs"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.app[0].name : null
}

output "cloudwatch_log_group_arn" {
  description = "CloudWatch log group ARN"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.app[0].arn : null
}

output "resource_group_console_url" {
  description = "Direct link to AWS Resource Group showing all EngageNinja resources"
  value       = "https://console.aws.amazon.com/resource-groups/groups/${aws_resourcegroups_group.engageninja.arn}?region=us-east-1"
}
