# ============================================================================
# Core Variables
# ============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "engageninja"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# ============================================================================
# SQS Configuration Variables
# ============================================================================

variable "sqs_message_retention_seconds" {
  description = "SQS message retention in seconds"
  type        = number
  default     = 1209600
}

variable "sqs_visibility_timeout_seconds" {
  description = "SQS visibility timeout in seconds"
  type        = number
  default     = 300
}

# ============================================================================
# CloudWatch Configuration Variables
# ============================================================================

variable "cloudwatch_logs_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = number
  default     = 30
}

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch Logs"
  type        = bool
  default     = true
}

# ============================================================================
# SNS Configuration Variables
# ============================================================================

variable "sns_retry_policy_max_receive_count" {
  description = "SNS message delivery retry policy (number of retries)"
  type        = number
  default     = 3
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# ============================================================================
# IAM Configuration Variables
# ============================================================================

variable "iam_user_name" {
  description = "IAM user name"
  type        = string
  default     = "engageninja-app"
}

# ============================================================================
# Log Configuration Variables
# ============================================================================

variable "log_retention_days" {
  description = "Log retention in days"
  type        = number
  default     = 30
}

# ============================================================================
# SES Configuration Variables
# ============================================================================

variable "ses_configuration_set_name" {
  description = "SES Configuration Set name"
  type        = string
  default     = "engageninja-email-events"
}

# ============================================================================
# Postgres / Lambda Configuration
# ============================================================================

variable "db_name" {
  description = "Name of the Postgres database"
  type        = string
  default     = "engageninja"
}

variable "db_username" {
  description = "Postgres master username"
  type        = string
  default     = "engageninja"
}

variable "db_master_password" {
  description = "Postgres master password (leave empty to generate one)"
  type        = string
  default     = ""
}

variable "db_instance_class" {
  description = "RDS instance class (dev free tier)"
  type        = string
  default     = "db.t3.micro"
}

variable "db_engine_version" {
  description = "Postgres engine version"
  type        = string
  default     = "17.4"
}

variable "db_allocated_storage" {
  description = "Allocated storage (GB)"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum storage (GB)"
  type        = number
  default     = 100
}

variable "db_port" {
  description = "Postgres port"
  type        = number
  default     = 5432
}

variable "db_backup_retention_days" {
  description = "DB backup retention window"
  type        = number
  default     = 1
}

variable "backend_url" {
  description = "Backend base URL used by Lambdas for callbacks"
  type        = string
  default     = "http://localhost:5173"
}

variable "metrics_callback_path" {
  description = "Relative path on backend for SSE metric refresh"
  type        = string
  default     = "/webhooks/internal/metrics"
}

variable "encryption_key" {
  description = "Shared encryption key used to encrypt tenant credentials"
  type        = string
  default     = "default-dev-key-change-in-production"
}

variable "metrics_auth_token" {
  description = "Optional token to authenticate lambda callbacks to the backend"
  type        = string
  default     = ""
}

variable "lambda_timeout_seconds" {
  description = "Timeout for Node.js Lambdas (seconds)"
  type        = number
  default     = 30
}

variable "lambda_memory_mb" {
  description = "Memory allocation for Lambdas (MB)"
  type        = number
  default     = 512
}

variable "vpc_id" {
  description = "Existing VPC ID to host the RDS instance (leave empty for default)"
  type        = string
  default     = ""
}

variable "managed_vpc_cidr_block" {
  description = "CIDR block used to create a VPC when `vpc_id` is not set"
  type        = string
  default     = "10.10.0.0/16"
}

variable "managed_subnet_count" {
  description = "Number of subnets to create inside the managed VPC"
  type        = number
  default     = 2
}
