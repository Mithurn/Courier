#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 24.04 server. Run from the copied deploy/ folder.
set -euo pipefail

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

if ! swapon --show | grep -q .; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo 'vm.max_map_count=262144' | sudo tee /etc/sysctl.d/99-elasticsearch.conf >/dev/null
sudo sysctl --system >/dev/null

sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

mkdir -p frontend-dist
[ -f frontend-dist/index.html ] || echo '<h1>Courier</h1>' > frontend-dist/index.html

if [ ! -f .env ]; then
  cp .env.prod.example .env
  sed -i "s|^MYSQL_ROOT_PASSWORD=.*|MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
  sed -i "s|^BULLBOARD_PASSWORD=.*|BULLBOARD_PASSWORD=$(openssl rand -hex 12)|" .env
  chmod 600 .env
fi

echo "Bootstrap done. Log out and back in (docker group), then fill DOMAIN, GOOGLE_* and SLACK_* in .env and run ./deploy.sh"
