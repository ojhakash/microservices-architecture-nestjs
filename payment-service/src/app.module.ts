import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { PaymentsModule } from './payments/payments.module';
import { KafkaModule } from './kafka/kafka.module';
import { LoggerModule } from './observability/logger.module';
import { TracingModule } from './observability/tracing.module';
import { MetricsModule } from './observability/metrics.module';
import { HealthModule } from './observability/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    PaymentsModule,
    KafkaModule,
    LoggerModule,
    TracingModule,
    MetricsModule,
    HealthModule,
  ],
})
export class AppModule {}

