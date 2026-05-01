# infra/aws_apigateway_ha/outputs.tf
output "primary_api_endpoint" { value = aws_apigatewayv2_api.api.api_endpoint }
output "secondary_api_endpoint" { value = aws_apigatewayv2_api.api_secondary.api_endpoint }
