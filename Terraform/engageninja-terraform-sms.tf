# ============================================================================
# SMS Configuration (via AWS CLI through local-exec)
# This is a workaround until AWS provider supports Pinpoint SMS V2
# ============================================================================

# ============================================================================
# 1. SMS Configuration Set
# ============================================================================
resource "null_resource" "sms_configuration_set" {
  provisioner "local-exec" {
    command = "aws pinpoint-sms-voice-v2 create-configuration-set --configuration-set-name ${var.project_name}-sms-config-${var.environment} --region ${var.aws_region} 2>/dev/null || true"
  }

  triggers = {
    name = "${var.project_name}-sms-config-${var.environment}"
  }
}

# ============================================================================
# 2. SMS Protect Configuration
# ============================================================================
resource "null_resource" "sms_protect_configuration" {
  provisioner "local-exec" {
    command = "aws pinpoint-sms-voice-v2 create-protect-configuration --tags Key=Name,Value=${var.project_name}-protect-config-${var.environment} --region ${var.aws_region} 2>/dev/null || true"
  }

  triggers = {
    name = "${var.project_name}-protect-config-${var.environment}"
  }

  depends_on = [null_resource.sms_configuration_set]
}

# ============================================================================
# 3. Country Rule Configuration
# ============================================================================
resource "null_resource" "sms_country_rules" {
  provisioner "local-exec" {
    command = <<-EOT
      PROTECT_ID=$(aws pinpoint-sms-voice-v2 describe-protect-configurations \
        --region ${var.aws_region} \
        --query "ProtectConfigurations[?ProtectConfigurationName=='${var.project_name}-protect-config-${var.environment}'].ProtectConfigurationId" \
        --output text)
      
      if [ ! -z "$PROTECT_ID" ] && [ "$PROTECT_ID" != "None" ]; then
        aws pinpoint-sms-voice-v2 update-protect-configuration-country-rule-set \
          --protect-configuration-id "$PROTECT_ID" \
          --number-capability SMS \
          --country-rule-set-updates '[{"CountryCode":"US","AllowOutgoing":true}]' \
          --region ${var.aws_region}
      fi
    EOT
  }

  triggers = {
    protect_id = "${var.project_name}-protect-config-${var.environment}"
  }

  depends_on = [null_resource.sms_protect_configuration]
}

# ============================================================================
# 4. CloudWatch Log Group (native Terraform resource)
# ============================================================================
resource "aws_cloudwatch_log_group" "sms" {
  name              = "/aws/${var.project_name}/sms/${var.environment}"
  retention_in_days = var.cloudwatch_logs_retention_days

  tags = {
    Name        = "${var.project_name}-sms-logs"
    Environment = var.environment
    Project     = var.project_name
    CreatedBy   = "Terraform"
  }
}

# ============================================================================
# Outputs
# ============================================================================
output "sms_configuration_set_name" {
  value       = "${var.project_name}-sms-config-${var.environment}"
  description = "SMS Configuration Set Name"
}

output "sms_protect_configuration_name" {
  value       = "${var.project_name}-protect-config-${var.environment}"
  description = "SMS Protect Configuration Name"
}

output "sms_cloudwatch_log_group_name" {
  value       = aws_cloudwatch_log_group.sms.name
  description = "SMS CloudWatch Log Group Name"
}

output "sms_cloudwatch_log_group_arn" {
  value       = aws_cloudwatch_log_group.sms.arn
  description = "SMS CloudWatch Log Group ARN"
}
