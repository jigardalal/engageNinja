# ============================================================================
# SES Configuration Set (for email event tracking)
# ============================================================================
resource "aws_ses_configuration_set" "main" {
  name = var.ses_configuration_set_name
}

# ============================================================================
# SES Event Destination (route email events to SNS)
# NOTE: Commented out - requires SES production access
# Uncomment after requesting production access from AWS Support
# ============================================================================
# resource "aws_ses_event_destination" "email_events" {
#   name                   = "${var.ses_configuration_set_name}-email-events"
#   configuration_set_name = aws_ses_configuration_set.main.name
#   enabled                = true
#   matching_types         = ["bounce", "complaint", "delivery", "send"]
#
#   sns_destination {
#     topic_arn = aws_sns_topic.email_events.arn
#   }
#
#   depends_on = [
#     aws_sns_topic_policy.email_events_policy,
#     aws_sns_topic.email_events
#   ]
# }

# ============================================================================
# SES Outputs
# ============================================================================
output "ses_configuration_set_name" {
  description = "SES Configuration Set name"
  value       = aws_ses_configuration_set.main.name
}

output "ses_region" {
  description = "AWS region where SES is configured"
  value       = var.aws_region
  sensitive   = false
}
