import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { KafkaModule } from './kafka/kafka.module';
import { LoggerModule } from './observability/logger.module';
import { TracingModule } from './observability/tracing.module';
import { MetricsModule } from './observability/metrics.module';
import { HealthModule } from './observability/health.module';
import { User } from './users/entities/user.entity';
import { envValidationSchema } from './config/env.validation';

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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'userdb'),
        entities: [User],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    KafkaModule,
    UsersModule,
    LoggerModule,
    TracingModule,
    MetricsModule,
    HealthModule,
  ],
})
export class AppModule {}

