import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

const { trace, context, SpanStatusCode, SpanKind } = require('@opentelemetry/api');

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private tracer = trace.getTracer('user-service');

  intercept(execContext: ExecutionContext, next: CallHandler): Observable<any> {
    const request = execContext.switchToHttp().getRequest();
    const { method, url, route } = request;
    
    const spanName = route?.path ? `${method} ${route.path}` : `${method} ${url}`;
    
    // Create span and set it as active context
    const span = this.tracer.startSpan(spanName, { kind: SpanKind.SERVER });
    span.setAttribute('http.method', method);
    span.setAttribute('http.url', url);
    span.setAttribute('http.route', route?.path || url);

    // Set span as active context - this will be inherited by child operations
    const ctx = trace.setSpan(context.active(), span);
    
    // Use context.with to ensure the span context is active during request handling
    return context.with(ctx, () => {
      return next.handle().pipe(
        tap((response) => {
          span.setAttribute('http.status_code', 200);
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
        }),
        catchError((error) => {
          span.setAttribute('http.status_code', error.status || 500);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.recordException(error);
          span.end();
          throw error;
        }),
      );
    });
  }
}

