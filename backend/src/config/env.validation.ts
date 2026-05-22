import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql'] }).optional(),
  POSTGRES_HOST: Joi.string().default('127.0.0.1'),
  POSTGRES_PORT: Joi.number().default(5432),
  POSTGRES_DATABASE: Joi.string().default('multi_chatbot'),
  POSTGRES_USERNAME: Joi.string().default('postgres'),
  POSTGRES_PASSWORD: Joi.string().allow('').default('postgres'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  JWT_ACCESS_SECRET: Joi.string().min(24).required(),
  JWT_REFRESH_SECRET: Joi.string().min(24).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('30d'),
  OPENAI_API_KEY: Joi.string().required(),
  OPENAI_CHAT_MODEL: Joi.string().default('gpt-4.1-mini'),
  OPENAI_EMBEDDING_MODEL: Joi.string().default('text-embedding-3-small'),
  PLAYWRIGHT_EXECUTABLE_PATH: Joi.string().optional(),
  CRAWLER_WAIT_UNTIL: Joi.string().valid('load', 'domcontentloaded', 'networkidle').default('domcontentloaded'),
  CRAWLER_TIMEOUT_MS: Joi.number().default(30000),
  CRAWLER_RATE_LIMIT_MS: Joi.number().default(350),
  CRAWLER_IGNORE_HTTPS_ERRORS: Joi.boolean().default(false),
  CRAWLER_USER_AGENT: Joi.string().optional(),
  BACKEND_PUBLIC_URL: Joi.string().uri().default('http://localhost:4000'),
  GITHUB_CLIENT_ID: Joi.string().allow('').optional(),
  GITHUB_CLIENT_SECRET: Joi.string().allow('').optional(),
  CLICKUP_CLIENT_ID: Joi.string().allow('').optional(),
  CLICKUP_CLIENT_SECRET: Joi.string().allow('').optional(),
  JIRA_CLIENT_ID: Joi.string().allow('').optional(),
  JIRA_CLIENT_SECRET: Joi.string().allow('').optional(),
  SLACK_CLIENT_ID: Joi.string().allow('').optional(),
  SLACK_CLIENT_SECRET: Joi.string().allow('').optional(),
  ENCRYPTION_KEY: Joi.string().min(24).default('development-only-change-me'),
  WEBHOOK_SECRET: Joi.string().allow('').optional(),
  ACTION_QUEUE_CONCURRENCY: Joi.number().default(2),
  SYNC_QUEUE_CONCURRENCY: Joi.number().default(2),
  BACKEND_PORT: Joi.number().default(4000),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
}).custom((env, helpers) => {
  if (env.DATABASE_URL) return env;
  if (env.POSTGRES_HOST && env.POSTGRES_PORT && env.POSTGRES_DATABASE && env.POSTGRES_USERNAME !== undefined) {
    return env;
  }
  return helpers.error('any.custom', { message: 'Provide DATABASE_URL or POSTGRES_* connection variables.' });
});
