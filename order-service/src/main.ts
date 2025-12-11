import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './observability/exception.filter';
import { LoggerService } from './observability/logger.service';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
    bodyParser: true,
    rawBody: false,
  });

  // Global exception filter (logs errors to our LoggerService)
  const logger = app.get(LoggerService);
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // Request size limits (10MB for JSON, 10MB for URL-encoded)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Enhanced validation pipe with transformation and sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
      disableErrorMessages: false, // Show detailed error messages
      validationError: {
        target: false, // Don't expose target object in errors
        value: false, // Don't expose values in errors
      },
    }),
  );

  // CORS
  app.enableCors();

  // Start HTTP server
  const port = process.env.PORT || 3002;
  await app.listen(port);
  
  console.log(`🚀 Order Service running on http://localhost:${port}`);
  console.log(`📊 Metrics available at http://localhost:${port}/metrics`);
  console.log(`❤️  Health checks at http://localhost:${port}/health/live`);
  console.log(`✅ Using Confluent Kafka JavaScript Client`);
}

bootstrap();

