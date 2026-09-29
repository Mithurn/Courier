#!/usr/bin/env bash
# Resets Redis rate-limit counters & deletes test emails on production for a clean demo recording.
set -euo pipefail

echo "🧹 Resetting Courier demo state on production..."

ssh -i ~/.ssh/courier-key.pem ubuntu@13.127.103.34 '
  docker exec courier-redis-1 redis-cli eval "for _,k in ipairs(redis.call(\"keys\",\"rl*\")) do redis.call(\"del\",k) end" 0
  docker exec courier-mysql-1 mysql -uroot -p$(grep MYSQL_ROOT_PASSWORD ~/deploy/.env | cut -d= -f2) courier -e "DELETE FROM ScheduledEmail WHERE toEmail LIKE \"lead%\" OR toEmail LIKE \"restart%\" OR toEmail LIKE \"demo%\";"
'

echo "✨ Production reset complete! Fresh slate for your demo."
