output "sample_app_public_ips" {
  description = "Public IPs of all sample app instances"
  value       = module.sample_app[*].public_ips
}

output "sample_app_instance_ids" {
  description = "Instance IDs of all sample app instances"
  value       = module.sample_app[*].instance_ids
}

output "sample_app_security_group_ids" {
  description = "Security group IDs"
  value       = module.sample_app[*].security_group_id
}