# AWS Terraform Starter: Secure, Multi-AZ, GPU-ready

provider "aws" {
  region = var.region
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  name    = var.vpc_name
  cidr    = var.vpc_cidr
  azs     = var.azs
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets
  enable_nat_gateway = true
  enable_vpn_gateway = true
}

module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = var.eks_cluster_name
  cluster_version = "1.29"
  subnets         = module.vpc.private_subnets
  vpc_id          = module.vpc.vpc_id
  node_groups = {
    default = {
      desired_capacity = 2
      max_capacity     = 4
      min_capacity     = 1
      instance_type    = "t3.medium"
    }
    gpu = {
      desired_capacity = 1
      max_capacity     = 2
      min_capacity     = 0
      instance_type    = "g4dn.xlarge"
      taints = [{
        key    = "nvidia.com/gpu"
        value  = "present"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  identifier = var.db_identifier
  engine     = "postgres"
  instance_class = "db.m6g.large"
  allocated_storage = 100
  multi_az = true
  username = var.db_username
  password = var.db_password
  vpc_security_group_ids = [module.vpc.default_security_group_id]
  db_subnet_group_name   = module.vpc.database_subnet_group
}

resource "aws_s3_bucket" "logs" {
  bucket = var.log_bucket
  force_destroy = true
  lifecycle_rule {
    enabled = true
    expiration {
      days = 365
    }
  }
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
        kms_master_key_id = aws_kms_key.cmk.id
      }
    }
  }
  versioning {
    enabled = true
  }
  logging {
    target_bucket = var.log_bucket
    target_prefix = "access-logs/"
  }
}

resource "aws_kms_key" "cmk" {
  description = "CMK for sensitive data and logs"
  deletion_window_in_days = 30
  enable_key_rotation = true
}

# OPA/No-Before-Action hooks, IAM, PrivateLink, CloudHSM, logging, MDM, incident playbook to be added below
