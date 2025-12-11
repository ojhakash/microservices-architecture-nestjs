import { Injectable } from '@nestjs/common';
import { ConfluentKafkaService } from '../kafka/confluent-kafka.service';
import { LoggerService } from '../observability/logger.service';
import { PaymentCompletedEvent } from '../../../shared/events/payment.events';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  constructor(
    private kafkaService: ConfluentKafkaService,
    private logger: LoggerService,
  ) {}

  async processPayment(
    orderId: string,
    userId: string,
    amount: number,
    headers?: Record<string, string>,
  ) {
    const traceId = headers?.traceId || uuidv4();
    const spanId = uuidv4();
    const requestId = headers?.requestId || uuidv4();

    this.logger.logWithTrace(
      `Processing payment for order: ${orderId}, amount: ${amount}`,
      requestId,
      traceId,
      spanId,
      'PaymentsService',
      { orderId, userId, amount },
    );

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate payment processing (90% success rate)
    const paymentId = uuidv4();
    const status = Math.random() > 0.1 ? 'completed' : 'failed';

    this.logger.logWithTrace(
      `Payment processed: ${paymentId}, status: ${status}`,
      requestId,
      traceId,
      spanId,
      'PaymentsService',
      { paymentId, status },
    );

    // Publish payment.completed event
    const event: PaymentCompletedEvent = {
      paymentId,
      orderId,
      userId,
      amount,
      status,
      completedAt: new Date().toISOString(),
    };

    await this.kafkaService.emit('payment.completed', event, {
      requestId,
      traceId,
      spanId,
    });

    this.logger.logWithTrace(
      `Payment event published: ${paymentId}`,
      requestId,
      traceId,
      spanId,
      'PaymentsService',
    );

    return { paymentId, status };
  }
}

