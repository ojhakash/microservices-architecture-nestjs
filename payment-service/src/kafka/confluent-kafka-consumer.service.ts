import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaConsumer } from '@confluentinc/kafka-javascript';
import { LoggerService } from '../observability/logger.service';
import { PaymentsService } from '../payments/payments.service';
import { TracingService } from '../observability/tracing.service';
import { OrderCreatedEvent } from '../../../shared/events/order.events';
import { v4 as uuidv4 } from 'uuid';
const { context, trace } = require('@opentelemetry/api');

@Injectable()
export class ConfluentKafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private consumer: KafkaConsumer | null = null;
  private readonly brokers: string;
  private readonly groupId: string;
  private readonly clientId: string;
  private isConnected = false;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly logger: LoggerService,
    private readonly tracingService: TracingService,
    private readonly configService: ConfigService,
  ) {
    this.brokers = this.configService.get<string>('KAFKA_BROKERS', 'localhost:9094');
    this.groupId = 'payment-service-group';
    this.clientId = this.configService.get<string>('SERVICE_NAME', 'payment-service');
  }

  async onModuleInit() {
    await this.connectAndSubscribe();
  }

  async connectAndSubscribe() {
    if (this.isConnected && this.consumer) {
      return;
    }

    try {
      this.consumer = new KafkaConsumer({
        'bootstrap.servers': this.brokers,
        'group.id': this.groupId,
        'client.id': this.clientId,
        'auto.offset.reset': 'earliest',
        'socket.timeout.ms': 10000,
        'metadata.broker.list': this.brokers,
      });

      // Wait for the consumer to be ready using callback
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        this.consumer!.connect({ timeout: 10000 }, (err) => {
          clearTimeout(timeout);
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // Subscribe to topics after consumer is ready
      this.consumer.subscribe(['order.created']);
      this.isConnected = true;

      console.log('✅ Confluent Kafka consumer connected and subscribed to order.created');

      // Start consuming messages
      this.consumeMessages();
    } catch (error) {
      console.warn('⚠️  Confluent Kafka consumer connection failed:', error.message);
      this.isConnected = false;
      // Retry after delay
      setTimeout(() => this.connectAndSubscribe(), 5000);
    }
  }

  private async consumeMessages() {
    if (!this.consumer || !this.isConnected) {
      return;
    }

    const consumeLoop = () => {
      if (!this.isConnected || !this.consumer) {
        return;
      }

      // Confluent consume API: consume(number, callback)
      this.consumer.consume(10, (err, messages) => {
        if (err) {
          if (this.isConnected) {
            console.error('Error consuming messages:', err.message);
            setTimeout(consumeLoop, 1000);
          }
          return;
        }

        if (messages && messages.length > 0) {
          for (const message of messages) {
            try {
              const messagePayload = JSON.parse(message.value.toString());
              
              // Extract trace context from message payload (workaround for header issues)
              const headers: Record<string, string> = {};
              if (messagePayload._trace) {
                headers['x-trace-id'] = messagePayload._trace.traceId;
                headers['x-span-id'] = messagePayload._trace.spanId;
                headers['x-trace-flags'] = String(messagePayload._trace.flags || '1');
                
                // Remove trace metadata from event data
                delete messagePayload._trace;
              }
              
              const eventData = messagePayload as OrderCreatedEvent;

              // Process message asynchronously
              this.handleOrderCreated(eventData, headers).catch((error) => {
                this.logger.error(
                  'Failed to process order.created event',
                  error.stack,
                  'ConfluentKafkaConsumerService',
                );
              });

              // Commit message after processing
              this.consumer?.commitMessage(message);
            } catch (error) {
              this.logger.error(
                'Failed to parse order.created event',
                error.stack,
                'ConfluentKafkaConsumerService',
              );
            }
          }
        }

        // Continue consuming
        if (this.isConnected) {
          setImmediate(consumeLoop);
        }
      });
    };

    consumeLoop();
  }

  private async handleOrderCreated(event: OrderCreatedEvent, headers: Record<string, string>) {
    // Create a child span from the incoming trace context
    const span = this.tracingService.startSpanFromHeaders('process order.created', headers);
    span.setAttribute('messaging.system', 'kafka');
    span.setAttribute('messaging.destination', 'order.created');
    span.setAttribute('order.id', event.orderId);
    span.setAttribute('user.id', event.userId);

    const requestId = headers.requestId || uuidv4();

    // Wrap execution in the span's context to ensure it's active
    await context.with(trace.setSpan(context.active(), span), async () => {
      this.logger.logWithTrace(
        `Received order.created event for order: ${event.orderId}`,
        requestId,
        headers['x-trace-id'] || uuidv4(),
        headers['x-span-id'] || uuidv4(),
        'ConfluentKafkaConsumerService',
        {
          orderId: event.orderId,
          userId: event.userId,
          totalAmount: event.totalAmount,
        },
      );

      try {
        await this.paymentsService.processPayment(
          event.orderId,
          event.userId,
          event.totalAmount,
          headers,
        );

        span.setAttribute('payment.processed', true);
        this.logger.logWithTrace(
          `Successfully processed payment for order: ${event.orderId}`,
          requestId,
          headers['x-trace-id'] || uuidv4(),
          headers['x-span-id'] || uuidv4(),
          'ConfluentKafkaConsumerService',
        );
      } catch (error) {
        span.setAttribute('error', true);
        span.recordException(error);
        this.logger.error(
          `Failed to process payment for order ${event.orderId}`,
          error.stack,
          'ConfluentKafkaConsumerService',
          { orderId: event.orderId, error: error.message },
        );
      } finally {
        span.end();
      }
    });
  }

  async onModuleDestroy() {
    this.isConnected = false;
    if (this.consumer) {
      await this.consumer.disconnect();
    }
  }
}

