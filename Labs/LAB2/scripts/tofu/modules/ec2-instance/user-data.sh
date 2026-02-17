#!/usr/bin/env bash
yum update -y
yum install -y nodejs
nohup node /home/ec2-user/app.js > /var/log/node.log 2>&1 &