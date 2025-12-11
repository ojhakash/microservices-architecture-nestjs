import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { PaymentsService } from '../payments.service';
import { LoggerService } from '../../observability/logger.service';
import { OrderCreatedEvent } from '../../../../shared/events/order.events';
import { v4 as uuidv4 } from 'uuid';

@Controller()
export class OrderCreatedConsumer {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly logger: LoggerService,
  ) {}

  @EventPattern('order.created')
  async handleOrderCreated(
    @Payload() data: { value: OrderCreatedEvent; headers?: Record<string, string> },
    @Ctx() context: KafkaContext,
  ) {
    const event = data.value;
    const headers = data.headers || {};
    const traceId = headers.traceId || uuidv4();
    const spanId = uuidv4();
    const requestId = headers.requestId || uuidv4();

    this.logger.logWithTrace(
      `Received order.created event for order: ${event.orderId}`,
      requestId,
      traceId,
      spanId,
      'OrderCreatedConsumer',
      {
        orderId: event.orderId,
        userId: event.userId,
        totalAmount: event.totalAmount,
      },
    );

    try {
      // Process payment for the order
      await this.paymentsService.processPayment(
        event.orderId,
        event.userId,
        event.totalAmount,
        headers,
      );

      this.logger.logWithTrace(
        `Successfully processed payment for order: ${event.orderId}`,
        requestId,
        traceId,
        spanId,
        'OrderCreatedConsumer',
      );
    } catch (error) {
      this.logger.error(
        `Failed to process payment for order ${event.orderId}`,
        error.stack,
        'OrderCreatedConsumer',
        { orderId: event.orderId, error: error.message },
      );
    }
  }
}

