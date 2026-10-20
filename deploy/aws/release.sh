#!/bin/bash
set -euo pipefail
export HOME=/root
. /etc/courier.conf
APP=/opt/courier

/snap/bin/aws s3 cp "s3://$BUCKET/courier.tgz" /tmp/courier.tgz --region "$REGION" --only-show-errors
mkdir -p "$APP"
tar xzf /tmp/courier.tgz -C "$APP"

ENV=$(/snap/bin/aws ssm get-parameter --region "$REGION" --name /courier/env --with-decryption --query Parameter.Value --output text)
[ ${#ENV} -gt 100 ] || { echo "empty env from SSM"; exit 1; }
printf '%s\n' "$ENV" > "$APP/deploy/.env"
chmod 600 "$APP/deploy/.env"

docker run --rm -v "$APP/frontend:/app" -w /app node:22 sh -c "npm ci && npm run build"
rm -rf "$APP/deploy/frontend-dist"
cp -r "$APP/frontend/dist" "$APP/deploy/frontend-dist"

/usr/local/bin/courier-boot.sh --dns-only
cd "$APP/deploy"
chmod +x deploy.sh
./deploy.sh
