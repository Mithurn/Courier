#!/bin/bash
set -uo pipefail
export HOME=/root
. /etc/courier.conf
TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4)
DD=$(/snap/bin/aws ssm get-parameter --region "$REGION" --name /recoveryops/duckdns --with-decryption --query Parameter.Value --output text 2>/dev/null || true)
[ -n "$DD" ] && curl -s "https://www.duckdns.org/update?domains=$DOMAIN_NAME&token=${DD#*:}&ip=$IP" >/dev/null
[ "${1:-}" = --dns-only ] && exit 0
[ -f /opt/courier/deploy/docker-compose.prod.yml ] && cd /opt/courier/deploy && docker compose -f docker-compose.prod.yml up -d
exit 0
