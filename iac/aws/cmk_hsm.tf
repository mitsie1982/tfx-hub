# AWS KMS CMK and CloudHSM integration
resource "aws_kms_key" "cmk" {
  description             = "Customer managed key for sensitive data and logs"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.kms.json
}

# Example CloudHSM cluster (for advanced use)
resource "aws_cloudhsm_v2_cluster" "main" {
  subnet_ids = module.vpc.private_subnets
}

# Attach KMS CMK to S3, RDS, EKS, etc. as needed
