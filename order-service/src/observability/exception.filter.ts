import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from './logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message || message,
      error: exception instanceof Error ? exception.stack : String(exception),
    };

    // Log error using our LoggerService (will go to stdout/Filebeat/Kibana)
    this.logger.error(
      `HTTP ${status} Error: ${errorResponse.message}`,
      exception instanceof Error ? exception.stack : String(exception),
      'ExceptionFilter',
      {
        statusCode: status,
        path: request.url,
        method: request.method,
        requestId: request.headers['x-request-id'],
      },
    );

    response.status(status).json(errorResponse);
  }
}

