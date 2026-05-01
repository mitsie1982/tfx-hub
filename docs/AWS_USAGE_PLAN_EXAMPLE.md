docs/AWS_USAGE_PLAN_EXAMPLE.md

# AWS Usage Plan example (Terraform)
resource "aws_api_gateway_usage_plan" "basic" {
  name = "basic"
  api_stages {
    api_id = aws_apigatewayv2_api.api.id
    stage  = aws_apigatewayv2_stage.stage.name
  }
  throttle_settings {
    burst_limit = 200
    rate_limit  = 100
  }
  quota_settings {
    limit  = 1000
    period = "DAY"
  }
}
