#!/usr/bin/env bash

set -euo pipefail

# Start and persist the app as app-user during instance boot.
sudo su - app-user -c "pm2 start /home/app-user/app.config.js && pm2 save"
