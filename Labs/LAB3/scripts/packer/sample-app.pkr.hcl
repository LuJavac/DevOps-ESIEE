packer {
  required_plugins {
    amazon = {
      version = ">= 1.3.1"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

source "amazon-ebs" "sample_app" {
  ami_name        = "packer-sample-app-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  ami_description = "Amazon Linux 2023 AMI with sample-app managed by PM2."
  instance_type   = "t3.micro"
  region          = "us-east-2"
  source_ami      = "ami-0900fe555666598a2"
  ssh_username    = "ec2-user"
}

build {
  sources = [
    "source.amazon-ebs.sample_app"
  ]

  provisioner "file" {
    sources     = ["app.js", "app.config.js"]
    destination = "/tmp/"
  }

  provisioner "shell" {
    inline = [
      "set -euxo pipefail",
      "sudo dnf -y update",
      "sudo rm -f /etc/yum.repos.d/nodesource-nsolid.repo",
      "curl -fsSL https://rpm.nodesource.com/setup_21.x | sudo bash -",
      "sudo dnf -y install nodejs",
      "id -u app-user >/dev/null 2>&1 || sudo useradd -m -s /bin/bash app-user",
      "sudo npm install -g pm2",
      "sudo mv /tmp/app.js /tmp/app.config.js /home/app-user/",
      "sudo chown -R app-user:app-user /home/app-user",
      "sudo -iu app-user pm2 start /home/app-user/app.config.js",
      "sudo -iu app-user pm2 save",
      "sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u app-user --hp /home/app-user",
      "sudo systemctl enable pm2-app-user"
    ]
  }
}
