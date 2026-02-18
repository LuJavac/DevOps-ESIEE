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

variable "ami_id" {
  description = "AMI ID built by Packer for sample-app"
  type        = string
}

module "asg" {
  source = "../../modules/asg"

  name = "sample-app-asg"

  ami_id        = var.ami_id
  user_data     = filebase64("${path.module}/user-data.sh")
  app_http_port = 8080

  instance_type    = "t3.micro"
  min_size         = 1
  max_size         = 10
  desired_capacity = 3

  target_group_arns = [module.alb.target_group_arn]

  instance_refresh = {
    min_healthy_percentage = 90
    max_healthy_percentage = 100
    auto_rollback          = true
  }
}

module "alb" {
  source = "../../modules/alb"

  name                  = "sample-app-alb"
  alb_http_port         = 80
  app_http_port         = 8080
  app_health_check_path = "/"
}
