provider "aws" {
  region = "us-east-2"
}

module "oidc_provider" {
  source       = "../../modules/github-aws-oidc"
  provider_url = "https://token.actions.githubusercontent.com"
}

module "iam_roles" {
  source                    = "../../modules/gh-actions-iam-roles"
  name                      = "lambda-sample"
  oidc_provider_arn          = module.oidc_provider.oidc_provider_arn

  enable_iam_role_for_testing = true
  enable_iam_role_for_plan    = true
  enable_iam_role_for_apply   = true

  github_repo               = "liantoine/devops-labs"
  lambda_base_name          = "lambda-sample"

  # Choisis des noms stables dès maintenant (même si tu créeras le bucket/table plus tard)
  tofu_state_bucket         = "liantoine-devops-tofu-state-021490341961"
  tofu_state_dynamodb_table = "liantoine-devops-tofu-state-locks"
}
