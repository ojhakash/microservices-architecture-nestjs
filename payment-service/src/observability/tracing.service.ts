import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';

const { NodeTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { trace, context, propagation, SpanStatusCode, SpanKind } = require('@opentelemetry/api');
const { W3CTraceContextPropagator } = require('@opentelemetry/core');

@Injectable()
export class TracingService implements OnModuleInit, OnModuleDestroy {
  private provider: any;
  private tracer: any;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const otlpEndpoint = this.configService.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318/v1/traces');
    
    const exporter = new OTLPTraceExporter({
      url: otlpEndpoint,
    });

    this.provider = new NodeTracerProvider({
      resource: new Resource({
        'service.name': 'payment-service',
        'service.version': '1.0.0',
      }),
    });

    this.provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    this.provider.register();
    
    // Set up W3C trace context propagation
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
    
    const serviceName = this.configService.get<string>('SERVICE_NAME', 'payment-service');
    this.tracer = trace.getTracer(serviceName);

    this.logger.log(`📡 Tracing enabled - exporting to ${otlpEndpoint}`, 'TracingService');

    // Send a test span to verify Jaeger connection
    const span = this.tracer.startSpan('service-started');
    span.setAttribute('service', serviceName);
    span.end();
    this.logger.log('📡 Test span sent to Jaeger', 'TracingService');
  }

  // Create a span for an operation (as child of active span if exists)
  startSpan(name: string, attributes?: Record<string, string>) {
    // Use active context to create child span
    const span = this.tracer.startSpan(name, {}, context.active());
    if (attributes) {
      Object.entries(attributes).forEach(([k, v]) => span.setAttribute(k, v));
    }
    return span;
  }

  // Inject trace context into headers (for outgoing messages)
  injectContext(headers: Record<string, string> = {}): Record<string, string> {
    propagation.inject(context.active(), headers);
    return headers;
  }

  // Inject a specific span's context into headers
  injectContextFromSpan(span: any, headers: Record<string, string> = {}): Record<string, string> {
    const spanContext = span.spanContext();
    // Manually set trace context headers (more reliable than W3C propagation for Kafka)
    headers['x-trace-id'] = spanContext.traceId;
    headers['x-span-id'] = spanContext.spanId;
    headers['x-trace-flags'] = String(spanContext.traceFlags || 1);
    return headers;
  }

  // Extract trace context from headers and create a child span in the SAME trace
  startSpanFromHeaders(name: string, headers: Record<string, string>, kind = SpanKind.CONSUMER) {
    const parentTraceId = headers['x-trace-id'];
    const parentSpanId = headers['x-span-id'];
    
    if (parentTraceId && parentSpanId) {
      // Create span context directly from the parent trace/span IDs
      // TraceFlags.SAMPLED = 0x01 = 1
      const flags = parseInt(headers['x-trace-flags'] || '1', 10);
      const parentSpanContext = {
        traceId: parentTraceId,
        spanId: parentSpanId,
        traceFlags: flags,
        isRemote: true,
      };
      
      // Set the parent span context directly
      const parentContext = trace.setSpanContext(context.active(), parentSpanContext);
      
      // Create a child span in the SAME trace using the parent context
      const span = this.tracer.startSpan(name, {
        kind,
      }, parentContext);
      
      span.setAttribute('messaging.system', 'kafka');
      return span;
    }
    
    // Fallback: create a new root span
    return this.tracer.startSpan(name, { kind });
  }

  // Get current trace context as headers
  getTraceHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    propagation.inject(context.active(), headers);
    return headers;
  }

  onModuleDestroy() {
    if (this.provider) {
      this.provider.shutdown();
    }
  }
}

