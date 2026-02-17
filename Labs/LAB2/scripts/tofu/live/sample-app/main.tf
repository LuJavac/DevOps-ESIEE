provider "aws" {
  region = "us-east-2"
}

variable "instance_count" {
  description = "Number of EC2 instances"
  type        = number
  default     = 2
}

module "sample_app" {
  source        = "../../modules/ec2-instance"
  count         = var.instance_count

  ami_id        = "ami-0e010d6a1f1418320"
  name          = "sample-app-tofu-${count.index}" # Nom unique
  instance_type = "t3.micro"
  http_port     = 8080
}
