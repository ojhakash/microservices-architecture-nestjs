import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { OrdersService } from '../orders.service';
import { LoggerService } from '../../observability/logger.service';
import { UserCreatedEvent } from '../../../../shared/events/user.events';
import { v4 as uuidv4 } from 'uuid';

@Controller()
export class UserCreatedConsumer {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly logger: LoggerService,
  ) {}

  @EventPattern('user.created')
  async handleUserCreated(
    @Payload() data: { value: UserCreatedEvent; headers?: Record<string, string> },
    @Ctx() context: KafkaContext,
  ) {
    const event = data.value;
    const headers = data.headers || {};
    const traceId = headers.traceId || uuidv4();
    const spanId = uuidv4();
    const requestId = headers.requestId || uuidv4();

    this.logger.logWithTrace(
      `Received user.created event for user: ${event.userId}`,
      requestId,
      traceId,
      spanId,
      'UserCreatedConsumer',
      { userId: event.userId, email: event.email },
    );

    try {
      // Automatically create a welcome order for the new user
      await this.ordersService.createOrderForUser(event.userId, headers);

      this.logger.logWithTrace(
        `Successfully created welcome order for user: ${event.userId}`,
        requestId,
        traceId,
        spanId,
        'UserCreatedConsumer',
      );
    } catch (error) {
      this.logger.error(
        `Failed to create order for user ${event.userId}`,
        error.stack,
        'UserCreatedConsumer',
        { userId: event.userId, error: error.message },
      );
    }
  }
}

