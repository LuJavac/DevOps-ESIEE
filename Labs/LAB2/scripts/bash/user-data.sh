#!/usr/bin/env bash
# Install updates and Node.js, then run the app
yum update -y
curl -sL https://rpm.nodesource.com/setup_21.x | bash -
yum install -y nodejs
# Download the sample app (assuming it's hosted somewhere accessible)
curl -o /home/ec2-user/app.js https://raw.githubusercontent.com/BTajini/devops-base/0389423c39cae0c094c394824f2e2cb88c0f763c/td1/sample-app/app.js
# Start the Node.js app
nohup node /home/ec2-user/app.js &