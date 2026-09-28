const defaults: Record<string, string> = {
  DATABASE_URL: 'mysql://root:courier@localhost:3306/courier_test',
  REDIS_URL: 'redis://localhost:6379/1',
  ELASTICSEARCH_URL: 'http://localhost:9200',
  ELASTICSEARCH_INDEX: 'courier-emails-test',
  FRONTEND_URL: 'http://localhost:5173',
  WORKER_CONCURRENCY: '2',
  MIN_DELAY_BETWEEN_SENDS_MS: '50',
  MAX_EMAILS_PER_HOUR_PER_SENDER: '50',
  DAILY_EMAIL_QUOTA_PER_USER: '20',
  JOB_RETRY_ATTEMPTS: '2',
  JOB_RETRY_BACKOFF_MS: '100',
  GOOGLE_CLIENT_ID: 'test',
  GOOGLE_CLIENT_SECRET: 'test',
  GOOGLE_CALLBACK_URL: 'http://localhost:4000/auth/google/callback',
  SLACK_CLIENT_ID: 'test',
  SLACK_CLIENT_SECRET: 'test',
  SLACK_REDIRECT_URI: 'http://localhost:4000/auth/slack/callback',
  JWT_SECRET: 'test-secret-test-secret-test-secret-0123',
  BULLBOARD_PASSWORD: 'test-bull-board-password',
};

for (const [key, value] of Object.entries(defaults)) process.env[key] ??= value;
