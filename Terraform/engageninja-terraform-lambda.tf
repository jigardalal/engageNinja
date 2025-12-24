locals {
  database_url     = "postgresql://${var.db_username}:${urlencode(local.db_password)}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}?sslmode=require"
  metrics_endpoint = "${var.backend_url}${var.metrics_callback_path}"
  lambda_common_env = {
    DATABASE_URL       = local.database_url
    ENCRYPTION_KEY     = var.encryption_key
    METRICS_ENDPOINT   = local.metrics_endpoint
    METRICS_AUTH_TOKEN = var.metrics_auth_token
    LOG_LEVEL          = "debug"
  }
}

resource "aws_iam_role" "lambda_exec" {
  name_prefix = "${var.project_name}-lambda-${var.environment}-"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
      Effect    = "Allow"
    }]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-lambda-execution"
    }
  )
}

resource "aws_iam_role_policy_attachment" "lambda_basic_exec" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_sqs_events" {
  name = "${var.project_name}-lambda-permissions-${var.environment}"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [
          aws_sqs_queue.messages.arn,
          aws_sqs_queue.messages_dlq.arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["events:PutEvents"]
        Resource = "*"
      }
    ]
  })
}

data "archive_file" "lambda_bundle" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda"
  output_path = "${path.module}/../lambda/build/engageninja-lambdas.zip"
}

resource "aws_lambda_function" "send_campaign" {
  function_name    = "${var.project_name}-send-campaign-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "functions/send-campaign-message/index.handler"
  runtime          = "nodejs18.x"
  architectures    = ["x86_64"]
  timeout          = var.lambda_timeout_seconds
  memory_size      = var.lambda_memory_mb
  filename         = data.archive_file.lambda_bundle.output_path
  source_code_hash = data.archive_file.lambda_bundle.output_base64sha256

  environment {
    variables = merge(
      local.lambda_common_env,
      {
        EVENT_BRIDGE_SOURCE = "${var.project_name}.messaging"
      }
    )
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-send-campaign-${var.environment}"
      Service = "Lambda"
    }
  )
}

resource "aws_lambda_function" "update_message_status" {
  function_name    = "${var.project_name}-update-status-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "functions/update-message-status/index.handler"
  runtime          = "nodejs18.x"
  architectures    = ["x86_64"]
  timeout          = var.lambda_timeout_seconds
  memory_size      = var.lambda_memory_mb
  filename         = data.archive_file.lambda_bundle.output_path
  source_code_hash = data.archive_file.lambda_bundle.output_base64sha256

  environment {
    variables = local.lambda_common_env
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-update-status-${var.environment}"
      Service = "Lambda"
    }
  )
}

resource "aws_lambda_function" "twilio_webhook" {
  function_name    = "${var.project_name}-twilio-webhook-${var.environment}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "functions/twilio-webhook/index.handler"
  runtime          = "nodejs18.x"
  architectures    = ["x86_64"]
  timeout          = var.lambda_timeout_seconds
  memory_size      = var.lambda_memory_mb
  filename         = data.archive_file.lambda_bundle.output_path
  source_code_hash = data.archive_file.lambda_bundle.output_base64sha256

  environment {
    variables = local.lambda_common_env
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-twilio-webhook-${var.environment}"
      Service = "Lambda"
    }
  )
}

resource "aws_lambda_event_source_mapping" "send_campaign_sqs" {
  event_source_arn = aws_sqs_queue.messages.arn
  function_name    = aws_lambda_function.send_campaign.function_name
  batch_size       = 10
  enabled          = true
}

resource "aws_cloudwatch_event_rule" "mock_status_updates" {
  name_prefix = "${var.project_name}-status-update-${var.environment}-"
  event_pattern = jsonencode({
    source      = ["${var.project_name}.messaging"]
    detail-type = ["MockStatusUpdate", "ProviderStatusUpdate"]
  })

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-status-update-${var.environment}"
      Service = "EventBridge"
    }
  )
}

resource "aws_cloudwatch_event_target" "mock_status_updates_target" {
  rule = aws_cloudwatch_event_rule.mock_status_updates.name
  arn  = aws_lambda_function.update_message_status.arn
}

resource "aws_lambda_permission" "allow_eventbridge_status" {
  statement_id  = "AllowEventBridgeStatus"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_message_status.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.mock_status_updates.arn
}

resource "aws_apigatewayv2_api" "webhooks" {
  name          = "${var.project_name}-webhooks-${var.environment}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["*"]
    allow_methods = ["OPTIONS", "POST"]
    allow_origins = ["*"]
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-webhooks-${var.environment}"
      Service = "APIGateway"
    }
  )
}

resource "aws_apigatewayv2_integration" "twilio" {
  api_id                 = aws_apigatewayv2_api.webhooks.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.twilio_webhook.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "twilio_post" {
  api_id    = aws_apigatewayv2_api.webhooks.id
  route_key = "POST /webhooks/twilio"
  target    = "integrations/${aws_apigatewayv2_integration.twilio.id}"
}

resource "aws_apigatewayv2_route" "twilio_sms_post" {
  api_id    = aws_apigatewayv2_api.webhooks.id
  route_key = "POST /webhooks/twilio/sms"
  target    = "integrations/${aws_apigatewayv2_integration.twilio.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.webhooks.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    detailed_metrics_enabled = true
  }
}

resource "aws_lambda_permission" "twilio_api" {
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.twilio_webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.webhooks.execution_arn}/*/*"
}

output "lambda_role_arn" {
  description = "IAM role ARN used by the Lambdas"
  value       = aws_iam_role.lambda_exec.arn
}

output "metrics_callback_url" {
  description = "URL Lambdas use to notify the backend for SSE updates"
  value       = local.metrics_endpoint
}

output "twilio_webhook_base_url" {
  description = "Base URL for the webhook HTTP API"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "twilio_webhook_url" {
  description = "Public webhook URL (Twilio should call this)"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}webhooks/twilio"
}

output "twilio_webhook_sms_url" {
  description = "Alternate webhook path for Twilio SMS"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}webhooks/twilio/sms"
}
