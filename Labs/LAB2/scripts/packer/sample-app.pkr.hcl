packer {
  required_plugins {
    amazon = {
      version = ">= 1.3.1"
      source  = "github.com/hashicorp/amazon"
    }
    virtualbox = {
      version = ">= 1.0.4"
      source  = "github.com/hashicorp/virtualbox"
    }
  }
}

source "amazon-ebs" "amazon_linux" {                  
  ami_name        = "sample-app-packer-${uuidv4()}"
  ami_description = "Amazon Linux 2023 AMI with a Node.js sample app."
  instance_type   = "t3.micro"
  region          = "us-east-2"
  source_ami      = "ami-0900fe555666598a2"
  ssh_username    = "ec2-user"
}

source "virtualbox-iso" "local_linux" {
  vm_name          = "sample-app-virtualbox"
  iso_url          = "https://mirror.rackspace.com/almalinux/9/isos/x86_64/AlmaLinux-9-latest-x86_64-minimal.iso"
  iso_checksum     = "none"
  ssh_username     = "vagrant"
  ssh_password     = "vagrant"
  shutdown_command = "sudo shutdown -P now"
}

build {                                               
  sources = [
    "source.amazon-ebs.amazon_linux",
    "source.virtualbox-iso.local_linux"
  ]

  provisioner "file" {                                
    source      = "app.js"
    destination = "/home/ec2-user/app.js"
  }

  provisioner "shell" {                               
    inline = [
      "curl -fsSL https://rpm.nodesource.com/setup_21.x | sudo bash -",
      "sudo yum install -y nodejs"
    ]
    pause_before = "30s"
  }
}