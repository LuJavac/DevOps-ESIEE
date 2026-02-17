provider "aws" {
  region = "us-east-2"
}

module "sample_app_1" {
  source    = "github.com/brikis98/devops-book//ch2/tofu/modules/ec2-instance?ref=1.0.0"
  name      = "sample-app-tofu-1"
  ami_name  = "sample-app-packer-*"
  instance_type = "t3.micro"
  http_port     = 8080
}

module "sample_app_2" {
  source    = "github.com/brikis98/devops-book//ch2/tofu/modules/ec2-instance?ref=1.0.0"
  name      = "sample-app-tofu-2"
  ami_name  = "sample-app-packer-*"
  instance_type = "t3.micro"
  http_port     = 8080
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "4.0.0"   # toujours spécifier une version stable

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-2a", "us-east-2b", "us-east-2c"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}