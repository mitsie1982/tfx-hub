# Private endpoints and IAM RBAC
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = module.vpc.vpc_id
  service_name = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
}

resource "aws_iam_role" "app" {
  name = "app-role"
  assume_role_policy = data.aws_iam_policy_document.app_assume.json
}

# Attach policies for least privilege
