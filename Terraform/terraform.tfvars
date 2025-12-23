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

# CloudWatch Configuration
enable_cloudwatch_logs = true
log_retention_days     = 30

# Additional Tags
tags = {
  Environment = "dev"
  Team        = "Backend"
  Project     = "EngageNinja"
}

backend_url              = "http://localhost:5173"
metrics_callback_path    = "/webhooks/internal/metrics"
encryption_key           = "default-dev-key-change-in-production"
metrics_auth_token       = ""
db_name                  = "engageninja"
db_username              = "engageninja"
db_master_password       = ""
db_instance_class        = "db.t3.micro"
db_engine_version        = "17.4"
db_allocated_storage     = 20
db_max_allocated_storage = 100
db_port                  = 5432
db_backup_retention_days = 1
lambda_timeout_seconds   = 30
lambda_memory_mb         = 512
