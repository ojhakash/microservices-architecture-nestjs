import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: ReturnType<typeof pino>;

  constructor() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const usePretty = process.env.LOG_FORMAT !== 'json' && isDevelopment;
    const serviceName = process.env.SERVICE_NAME || 'user-service';
    const logToFile = process.env.LOG_TO_FILE === 'true' || (!process.env.DOCKER_ENV && isDevelopment);

    // Multi-stream: stdout (JSON for Docker/Filebeat) + optional file
    const streams: Array<{ level: string; stream: NodeJS.WritableStream }> = [];

    if (usePretty && !process.env.DOCKER_ENV) {
      // Pretty console output for local development (not in Docker)
      streams.push({
        level: 'info',
        stream: pino.transport({
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }),
      });
    } else {
      // JSON stdout output (captured by Docker or Filebeat)
      streams.push({
        level: 'info',
        stream: process.stdout,
      });
    }

    // Optional: Write to file only when LOG_TO_FILE=true or running locally
    if (logToFile) {
      const logsDir = path.join(process.cwd(), '..', 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      const logFile = path.join(logsDir, 'app.log');
      streams.push({
        level: 'info',
        stream: fs.createWriteStream(logFile, { flags: 'a' }),
      });
    }

    this.logger = pino(
      {
        level: process.env.LOG_LEVEL || 'info',
        formatters: {
          level: (label) => {
            return { level: label };
          },
        },
        base: {
          service: serviceName,
          env: process.env.NODE_ENV || 'development',
        },
      },
      pino.multistream(streams),
    );
  }

  log(message: any, context?: string, meta?: Record<string, any>) {
    this.logger.info({ context, ...meta }, message);
  }

  error(message: any, trace?: string, context?: string, meta?: Record<string, any>) {
    this.logger.error({ context, trace, ...meta }, message);
  }

  warn(message: any, context?: string, meta?: Record<string, any>) {
    this.logger.warn({ context, ...meta }, message);
  }

  debug(message: any, context?: string, meta?: Record<string, any>) {
    this.logger.debug({ context, ...meta }, message);
  }

  verbose(message: any, context?: string, meta?: Record<string, any>) {
    this.logger.trace({ context, ...meta }, message);
  }

  logWithTrace(
    message: string,
    requestId: string,
    traceId: string,
    spanId: string,
    context?: string,
    meta?: Record<string, any>,
  ) {
    this.logger.info(
      {
        context,
        requestId,
        traceId,
        spanId,
        ...meta,
      },
      message,
    );
  }
}

