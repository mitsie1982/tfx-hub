# Logging and retention for POPIA compliance
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${var.eks_cluster_name}"
  retention_in_days = 365
}

resource "aws_s3_bucket_lifecycle_configuration" "log_retention" {
  bucket = aws_s3_bucket.logs.id
  rule {
    id     = "retain-logs"
    status = "Enabled"
    expiration {
      days = 365
    }
  }
}
