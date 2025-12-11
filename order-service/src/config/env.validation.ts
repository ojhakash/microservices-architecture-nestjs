import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3002),
  SERVICE_NAME: Joi.string().default('order-service'),
  
  // Database Configuration
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5433),
  DB_USERNAME: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('postgres'),
  DB_NAME: Joi.string().default('orderdb'),
  
  // Kafka Configuration
  KAFKA_BROKERS: Joi.string().default('localhost:9094'),
  
  // OpenTelemetry Configuration
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().uri().default('http://localhost:4318/v1/traces'),
  
  // Logging Configuration
  LOG_LEVEL: Joi.string().valid('trace', 'debug', 'info', 'warn', 'error', 'fatal').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').optional(),
  LOG_TO_FILE: Joi.string().valid('true', 'false').default('false'),
  DOCKER_ENV: Joi.string().valid('true', 'false').default('false'),
});

