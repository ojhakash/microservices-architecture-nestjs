import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfluentKafkaService } from '../kafka/confluent-kafka.service';
import { LoggerService } from '../observability/logger.service';
import { OrderCreatedEvent } from '../../../shared/events/order.events';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private kafkaService: ConfluentKafkaService,
    private logger: LoggerService,
  ) {}

  async create(createOrderDto: CreateOrderDto, requestId?: string) {
    const traceId = uuidv4();
    const spanId = uuidv4();
    const reqId = requestId || uuidv4();

    this.logger.logWithTrace(
      `Creating order for user: ${createOrderDto.userId}`,
      reqId,
      traceId,
      spanId,
      'OrdersService',
    );

    const totalAmount = createOrderDto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order = this.ordersRepository.create({
      userId: createOrderDto.userId,
      items: createOrderDto.items,
      totalAmount,
    });

    const savedOrder = await this.ordersRepository.save(order);

    // Publish order.created event
    const event: OrderCreatedEvent = {
      orderId: savedOrder.id,
      userId: savedOrder.userId,
      items: savedOrder.items,
      totalAmount: parseFloat(savedOrder.totalAmount.toString()),
      createdAt: savedOrder.createdAt.toISOString(),
    };

    await this.kafkaService.emit('order.created', event, {
      requestId: reqId,
      traceId,
      spanId,
    });

    this.logger.logWithTrace(
      `Order created successfully: ${savedOrder.id}`,
      reqId,
      traceId,
      spanId,
      'OrdersService',
    );

    return savedOrder;
  }

  async findAll(requestId?: string) {
    const traceId = uuidv4();
    const spanId = uuidv4();
    const reqId = requestId || uuidv4();

    this.logger.logWithTrace(
      'Fetching all orders',
      reqId,
      traceId,
      spanId,
      'OrdersService',
    );

    return this.ordersRepository.find();
  }

  async findOne(id: string, requestId?: string) {
    const traceId = uuidv4();
    const spanId = uuidv4();
    const reqId = requestId || uuidv4();

    this.logger.logWithTrace(
      `Fetching order: ${id}`,
      reqId,
      traceId,
      spanId,
      'OrdersService',
    );

    return this.ordersRepository.findOne({ where: { id } });
  }

  async createOrderForUser(userId: string, headers?: Record<string, string>) {
    const traceId = headers?.traceId || uuidv4();
    const spanId = uuidv4();
    const reqId = headers?.requestId || uuidv4();

    this.logger.logWithTrace(
      `Auto-creating order for new user: ${userId}`,
      reqId,
      traceId,
      spanId,
      'OrdersService',
    );

    // Create a welcome order for the new user
    const welcomeOrder: CreateOrderDto = {
      userId,
      items: [
        {
          productId: 'welcome-product',
          quantity: 1,
          price: 0,
        },
      ],
    };

    return this.create(welcomeOrder, reqId);
  }
}

