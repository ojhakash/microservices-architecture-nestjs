import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3003),
  SERVICE_NAME: Joi.string().default('payment-service'),
  
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

