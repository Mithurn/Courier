/** OpenAPI 3.0 spec for the Courier API, served via swagger-ui-express at /docs. */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Courier API',
    version: '1.0.0',
    description: 'Email scheduler: schedule emails, track them through Scheduled/Sent, and manage senders and integrations.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Auth', description: 'Google login session, Slack OAuth connect/disconnect' },
    { name: 'Senders', description: 'Sending mailbox identities' },
    { name: 'Emails', description: 'Scheduling, listing, searching, and labeling emails' },
  ],
  components: {
    securitySchemes: {
      sessionCookie: { type: 'apiKey', in: 'cookie', name: 'courier_session' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { oneOf: [{ type: 'string' }, { type: 'object' }] } },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          avatarUrl: { type: 'string', nullable: true },
        },
      },
      Sender: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          hourlyLimit: { type: 'integer' },
        },
      },
      EmailListItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          from: { type: 'string' },
          toEmail: { type: 'string' },
          subject: { type: 'string' },
          preview: { type: 'string' },
          status: { type: 'string', enum: ['scheduled', 'sending', 'sent', 'failed'] },
          scheduledAt: { type: 'string', format: 'date-time' },
          sentAt: { type: 'string', format: 'date-time', nullable: true },
          failReason: { type: 'string', nullable: true },
          starred: { type: 'boolean' },
          archived: { type: 'boolean' },
          trashed: { type: 'boolean' },
        },
      },
      EmailDetail: {
        allOf: [{ $ref: '#/components/schemas/EmailListItem' }, { type: 'object', properties: { body: { type: 'string' } } }],
      },
      Page: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/EmailListItem' } },
          total: { type: 'integer' },
        },
      },
      ScheduleInput: {
        type: 'object',
        required: ['senderId', 'subject', 'body', 'recipients'],
        properties: {
          senderId: { type: 'string' },
          subject: { type: 'string', maxLength: 191 },
          body: { type: 'string', description: 'HTML body, max 1,000,000 characters' },
          recipients: { type: 'array', items: { type: 'string', format: 'email' }, minItems: 1, maxItems: 5000 },
          startAt: { type: 'string', format: 'date-time', description: 'Defaults to now; must be within one year' },
          delayBetweenSendsMs: { type: 'integer', minimum: 0, maximum: 86400000 },
          hourlyLimit: { type: 'integer', minimum: 1 },
        },
      },
      ScheduleResult: {
        type: 'object',
        properties: {
          count: { type: 'integer' },
          hourlyLimit: { type: 'integer' },
          firstScheduledAt: { type: 'string', format: 'date-time' },
          lastScheduledAt: { type: 'string', format: 'date-time' },
        },
      },
      EmailFlags: {
        type: 'object',
        description: 'At least one flag is required.',
        properties: { starred: { type: 'boolean' }, archived: { type: 'boolean' }, trashed: { type: 'boolean' } },
      },
      Counts: {
        type: 'object',
        properties: { scheduled: { type: 'integer' }, sent: { type: 'integer' } },
      },
    },
  },
  security: [{ sessionCookie: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Emails'],
        security: [],
        summary: 'Liveness check',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/auth/google': {
      get: { tags: ['Auth'], security: [], summary: 'Start Google OAuth login', responses: { 302: { description: 'Redirect to Google' } } },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current session user',
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { description: 'Not authenticated' },
        },
      },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Clear session', responses: { 200: { description: 'OK' } } },
    },
    '/auth/slack': {
      get: { tags: ['Auth'], summary: 'Start Slack OAuth install', responses: { 302: { description: 'Redirect to Slack' } } },
    },
    '/auth/slack/status': {
      get: {
        tags: ['Auth'],
        summary: 'Slack connection status',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/auth/slack/disconnect': {
      post: { tags: ['Auth'], summary: 'Disconnect Slack', responses: { 200: { description: 'OK' } } },
    },
    '/senders': {
      get: {
        tags: ['Senders'],
        summary: 'List your senders (no SMTP secrets included)',
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Sender' } } } },
          },
        },
      },
      post: {
        tags: ['Senders'],
        summary: 'Provision a new Ethereal sender identity',
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Sender' } } } },
          409: { description: 'Sender limit reached', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/emails/schedule': {
      post: {
        tags: ['Emails'],
        summary: 'Schedule an email to one or more recipients (one row + job per recipient)',
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string', minLength: 8, maxLength: 128 } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ScheduleInput' } } } },
        responses: {
          201: { description: 'Scheduled', content: { 'application/json': { schema: { $ref: '#/components/schemas/ScheduleResult' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Duplicate Idempotency-Key' },
          429: { description: 'Daily quota exceeded' },
        },
      },
    },
    '/emails/scheduled': {
      get: {
        tags: ['Emails'],
        summary: 'List scheduled/sending emails',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['scheduled', 'sending'] } },
          { name: 'label', in: 'query', schema: { type: 'string', enum: ['starred', 'archived', 'trashed'] } },
        ],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Page' } } } } },
      },
    },
    '/emails/sent': {
      get: {
        tags: ['Emails'],
        summary: 'List sent/failed emails',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['sent', 'failed'] } },
          { name: 'label', in: 'query', schema: { type: 'string', enum: ['starred', 'archived', 'trashed'] } },
        ],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Page' } } } } },
      },
    },
    '/emails/counts': {
      get: {
        tags: ['Emails'],
        summary: 'Scheduled/Sent tab counts (excludes archived and trashed)',
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Counts' } } } } },
      },
    },
    '/emails/search': {
      get: {
        tags: ['Emails'],
        summary: 'Full-text search across your emails (Elasticsearch-backed)',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 200 } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Page' } } } },
          400: { description: 'Page window too large (page * pageSize > 10,000)' },
        },
      },
    },
    '/emails/{id}': {
      get: {
        tags: ['Emails'],
        summary: 'Get one email with full body',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/EmailDetail' } } } },
          404: { description: 'Not found or not owned by you' },
        },
      },
      patch: {
        tags: ['Emails'],
        summary: 'Toggle starred / archived / trashed',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EmailFlags' } } } },
        responses: {
          200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/EmailListItem' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'Not found or not owned by you' },
        },
      },
    },
  },
} as const;
