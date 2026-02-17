#!/usr/bin/env bash
set -e
export AWS_DEFAULT_REGION="us-east-2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
user_data=$(cat "$SCRIPT_DIR/user-data.sh")
# Create a security group
security_group_id=$(aws ec2 create-security-group \
--group-name "sample-app" \
--description "Allow HTTP traffic into the sample app" \
--output text \
--query GroupId)
# Allow inbound HTTP traffic
aws ec2 authorize-security-group-ingress \
--group-id "$security_group_id" \
--protocol tcp \
--port 8080 \
--cidr "0.0.0.0/0" > /dev/null

# Autoriser SSH
aws ec2 authorize-security-group-ingress \
--group-id "$security_group_id" \
--protocol tcp \
--port 22 \
--cidr "0.0.0.0/0" 2>/dev/null || true

# Launch the EC2 instance
instance_id=$(aws ec2 run-instances \
--image-id "ami-0900fe555666598a2" \
--instance-type "t3.micro" \
--security-group-ids "$security_group_id" \
--user-data "$user_data" \
--tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=sample-app}]' \
--output text \
--query Instances[0].InstanceId)
# Wait for the instance to be in running state
aws ec2 wait instance-running --instance-ids "$instance_id"
# Get the public IP address
public_ip=$(aws ec2 describe-instances \
--instance-ids "$instance_id" \
--output text \
--query 'Reservations[*].Instances[*].PublicIpAddress')
echo "Instance ID = $instance_id"
echo "Security Group ID = $security_group_id"
echo "Public IP = $public_ip"