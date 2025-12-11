import { Module, Global, OnModuleInit } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TracingService } from './tracing.service';
import { TracingInterceptor } from './tracing.interceptor';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [
    TracingService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
  ],
  exports: [TracingService],
})
export class TracingModule implements OnModuleInit {
  constructor(
    private readonly tracingService: TracingService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit() {
    this.logger.log('TracingModule initialized - HTTP requests will be traced', 'TracingModule');
  }
}

