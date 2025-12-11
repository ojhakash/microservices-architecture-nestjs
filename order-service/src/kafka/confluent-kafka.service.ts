import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Producer } from '@confluentinc/kafka-javascript';
import { TracingService } from '../observability/tracing.service';

@Injectable()
export class ConfluentKafkaService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer | null = null;
  private readonly brokers: string;
  private readonly clientId: string;
  private isConnected = false;

  constructor(
    private readonly tracingService: TracingService,
    private readonly configService: ConfigService,
  ) {
    this.brokers = this.configService.get<string>('KAFKA_BROKERS', 'localhost:9094');
    this.clientId = this.configService.get<string>('SERVICE_NAME', 'order-service');
  }

  async onModuleInit() {
    await this.connect();
  }

  async connect() {
    if (this.isConnected && this.producer) {
      return;
    }

    try {
      this.producer = new Producer({
        'bootstrap.servers': this.brokers,
        'client.id': this.clientId,
        'socket.timeout.ms': 10000,
        'metadata.broker.list': this.brokers,
      });

      // Wait for the producer to be ready using callback
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        this.producer!.connect({ timeout: 10000 }, (err) => {
          clearTimeout(timeout);
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.isConnected = true;
      console.log('✅ Confluent Kafka producer connected successfully');
    } catch (error) {
      console.warn('⚠️  Confluent Kafka producer connection failed:', error.message);
      this.isConnected = false;
      // Retry after delay
      setTimeout(() => this.connect(), 5000);
    }
  }

  async onModuleDestroy() {
    if (this.producer && this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
    }
  }

  async emit(topic: string, data: any, headers?: Record<string, string>) {
    if (!this.producer || !this.isConnected) {
      await this.connect();
      if (!this.producer || !this.isConnected) {
        throw new Error('Kafka producer not available');
      }
    }

    // Create a producer span and inject its context
    const span = this.tracingService.startSpan(`publish ${topic}`, {
      'messaging.system': 'kafka',
      'messaging.destination': topic,
    });
    
    // Inject trace context - encode in message payload since headers don't work reliably
    const traceHeaders = this.tracingService.injectContextFromSpan(span, headers || {});
    
    // Embed trace context in message payload (workaround for Confluent Kafka header issues)
    const messageWithTrace = {
      ...data,
      _trace: {
        traceId: traceHeaders['x-trace-id'],
        spanId: traceHeaders['x-span-id'],
        flags: traceHeaders['x-trace-flags'],
      },
    };

    // Confluent Producer API: produce(topic, partition, message, key, timestamp, opaque, headers)
    this.producer.produce(
      topic,
      null, // partition (null = auto-assign)
      Buffer.from(JSON.stringify(messageWithTrace)), // message value with trace context
      null, // key
      null, // timestamp (null = auto)
      null, // opaque
      undefined, // headers (not using headers due to Confluent Kafka JS client issues)
    );

    // Poll to ensure delivery
    this.producer.poll();
    
    span.end();
  }
}

