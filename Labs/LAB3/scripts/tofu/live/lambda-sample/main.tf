terraform {
  required_version = ">= 1.8.0"

  required_providers {
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-2"
}

module "function" {
  source = "../../modules/lambda"

  name = "lambda-sample"

  src_dir = "${path.module}/src"
  runtime = "nodejs20.x"
  handler = "index.handler"

  memory_size = 128
  timeout     = 5

  environment_variables = {
    NODE_ENV = "production"
  }

}

module "gateway" {
  source = "../../modules/api-gateway"

  name               = "lambda-sample"
  function_arn       = module.function.function_arn
  api_gateway_routes = ["GET /"]
}
