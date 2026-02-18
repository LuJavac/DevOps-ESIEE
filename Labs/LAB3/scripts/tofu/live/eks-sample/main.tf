terraform {
  required_version = ">= 1.8.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-2"
}

module "cluster" {
  source = "../../modules/eks-cluster"

  name        = "eks-sample"
  eks_version = "1.29"

  instance_type        = "t3.micro"
  min_worker_nodes     = 1
  max_worker_nodes     = 10
  desired_worker_nodes = 3
}
