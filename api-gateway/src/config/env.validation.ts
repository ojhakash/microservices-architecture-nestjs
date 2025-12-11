import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3005),
  
  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).default('your-secret-key-change-in-production-min-32-chars').messages({
    'string.min': 'JWT_SECRET must be at least 32 characters long',
  }),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  
  // Service URLs
  USER_SERVICE_URL: Joi.string().uri().default('http://localhost:3001'),
  ORDER_SERVICE_URL: Joi.string().uri().default('http://localhost:3002'),
  
  // API Keys
  SERVICE_API_KEYS: Joi.string().optional(),
});

