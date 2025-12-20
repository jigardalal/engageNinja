# ============================================================================
# terraform.tfvars (LOCAL DEVELOPMENT)
# ============================================================================
# Copy this to terraform.tfvars and update values for your environment
# Never commit credentials or sensitive data to version control!

# AWS Configuration
aws_region   = "us-east-1"
environment  = "dev"
project_name = "engageninja"

# IAM User Configuration
iam_user_name = "engageninja-app"

# SQS Configuration
sqs_message_retention_seconds  = 1209600 # 14 days
sqs_visibility_timeout_seconds = 300     # 5 minutes

# SES Configuration
ses_configuration_set_name = "engageninja-email-events"

# SMS Configuration
sms_sending_limit = 1.0 # $1 USD per month for testing

# CloudWatch Configuration
enable_cloudwatch_logs = true
log_retention_days     = 30

# Additional Tags
tags = {
  Environment = "dev"
  Team        = "Backend"
  Project     = "EngageNinja"
}
