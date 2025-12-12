import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { ConfluentKafkaService } from '../kafka/confluent-kafka.service';
import { LoggerService } from '../observability/logger.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { createMockRepository } from '../../test/mocks/repository.mock';
import { createMockKafkaService } from '../../test/mocks/kafka.mock';
import { createMockLogger } from '../../test/mocks/logger.mock';
import { createMockOrder } from '../../test/factories/order.factory';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: ReturnType<typeof createMockRepository>;
  let kafkaService: ReturnType<typeof createMockKafkaService>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    orderRepository = createMockRepository();
    kafkaService = createMockKafkaService();
    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepository,
        },
        {
          provide: ConfluentKafkaService,
          useValue: kafkaService,
        },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      userId: 'user-123',
      items: [
        {
          productId: 'prod-1',
          quantity: 2,
          price: 10.5,
        },
        {
          productId: 'prod-2',
          quantity: 1,
          price: 25,
        },
      ],
    };

    it('should calculate total amount correctly', async () => {
      const expectedTotal = 2 * 10.5 + 1 * 25; // 46

      const savedOrder = createMockOrder({
        userId: createOrderDto.userId,
        items: createOrderDto.items,
        totalAmount: expectedTotal,
      });

      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      const result = await service.create(createOrderDto);

      expect(orderRepository.create).toHaveBeenCalledWith({
        userId: createOrderDto.userId,
        items: createOrderDto.items,
        totalAmount: expectedTotal,
      });
      expect(result.totalAmount).toBe(expectedTotal);
    });

    it('should create order with correct userId', async () => {
      const savedOrder = createMockOrder({
        userId: createOrderDto.userId,
      });

      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      await service.create(createOrderDto);

      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
        }),
      );
    });

    it('should publish order.created event via Kafka', async () => {
      const savedOrder = createMockOrder({
        id: 'order-123',
        userId: createOrderDto.userId,
        items: createOrderDto.items,
        totalAmount: 46,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      });

      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      await service.create(createOrderDto);

      expect(kafkaService.emit).toHaveBeenCalledWith(
        'order.created',
        {
          orderId: 'order-123',
          userId: createOrderDto.userId,
          items: createOrderDto.items,
          totalAmount: 46,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          requestId: 'mock-uuid',
          traceId: 'mock-uuid',
          spanId: 'mock-uuid',
        },
      );
    });

    it('should handle single item order', async () => {
      const singleItemOrder: CreateOrderDto = {
        userId: 'user-123',
        items: [
          {
            productId: 'prod-1',
            quantity: 3,
            price: 15,
          },
        ],
      };

      const savedOrder = createMockOrder({
        items: singleItemOrder.items,
        totalAmount: 45,
      });

      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      const result = await service.create(singleItemOrder);

      expect(result.totalAmount).toBe(45);
    });

    it('should handle zero price items', async () => {
      const freeItemOrder: CreateOrderDto = {
        userId: 'user-123',
        items: [
          {
            productId: 'free-prod',
            quantity: 1,
            price: 0,
          },
        ],
      };

      const savedOrder = createMockOrder({
        items: freeItemOrder.items,
        totalAmount: 0,
      });

      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      const result = await service.create(freeItemOrder);

      expect(result.totalAmount).toBe(0);
    });

    it('should handle multiple items with different quantities and prices', async () => {
      const complexOrder: CreateOrderDto = {
        userId: 'user-123',
        items: [
          { productId: 'prod-1', quantity: 2, price: 10.99 },
          { productId: 'prod-2', quantity: 5, price: 3.5 },
          { productId: 'prod-3', quantity: 1, price: 100 },
        ],
      };

      const expectedTotal = 2 * 10.99 + 5 * 3.5 + 1 * 100; // 139.48

      const savedOrder = createMockOrder({
        items: complexOrder.items,
        totalAmount: expectedTotal,
      });

      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      const result = await service.create(complexOrder);

      expect(result.totalAmount).toBe(expectedTotal);
    });

    it('should log order creation with trace context', async () => {
      const savedOrder = createMockOrder();
      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      await service.create(createOrderDto);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Creating order for user: ${createOrderDto.userId}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'OrdersService',
      );

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Order created successfully: ${savedOrder.id}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'OrdersService',
      );
    });

    it('should use provided requestId if given', async () => {
      const savedOrder = createMockOrder();
      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      const customRequestId = 'custom-request-id';
      await service.create(createOrderDto, customRequestId);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        expect.any(String),
        customRequestId,
        'mock-uuid',
        'mock-uuid',
        'OrdersService',
      );
    });

    it('should save order to repository', async () => {
      const savedOrder = createMockOrder();
      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      await service.create(createOrderDto);

      expect(orderRepository.save).toHaveBeenCalledWith(savedOrder);
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      const orders = [
        createMockOrder({ userId: 'user-1' }),
        createMockOrder({ userId: 'user-2' }),
      ];

      orderRepository.find.mockResolvedValue(orders);

      const result = await service.findAll();

      expect(orderRepository.find).toHaveBeenCalled();
      expect(result).toEqual(orders);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no orders exist', async () => {
      orderRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should log the operation with trace context', async () => {
      orderRepository.find.mockResolvedValue([]);

      await service.findAll();

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        'Fetching all orders',
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'OrdersService',
      );
    });

    it('should use provided requestId if given', async () => {
      orderRepository.find.mockResolvedValue([]);

      const customRequestId = 'custom-request-id';
      await service.findAll(customRequestId);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        'Fetching all orders',
        customRequestId,
        'mock-uuid',
        'mock-uuid',
        'OrdersService',
      );
    });
  });

  describe('findOne', () => {
    it('should return order when found', async () => {
      const order = createMockOrder({ id: 'order-123' });
      orderRepository.findOne.mockResolvedValue(order);

      const result = await service.findOne('order-123');

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-123' },
      });
      expect(result).toEqual(order);
    });

    it('should return null when order does not exist', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('non-existent-id');

      expect(result).toBeNull();
    });

    it('should log the operation with trace context', async () => {
      const orderId = 'order-123';
      orderRepository.findOne.mockResolvedValue(null);

      await service.findOne(orderId);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Fetching order: ${orderId}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'OrdersService',
      );
    });

    it('should use provided requestId if given', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      const customRequestId = 'custom-request-id';
      await service.findOne('order-123', customRequestId);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        expect.any(String),
        customRequestId,
        'mock-uuid',
        'mock-uuid',
        'OrdersService',
      );
    });
  });

  describe('createOrderForUser', () => {
    const userId = 'new-user-123';

    it('should create welcome order with zero price item', async () => {
      const savedOrder = createMockOrder({
        userId,
        items: [
          {
            productId: 'welcome-product',
            quantity: 1,
            price: 0,
          },
        ],
        totalAmount: 0,
      });

      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      const result = await service.createOrderForUser(userId);

      expect(result.userId).toBe(userId);
      expect(result.items).toEqual([
        {
          productId: 'welcome-product',
          quantity: 1,
          price: 0,
        },
      ]);
      expect(result.totalAmount).toBe(0);
    });

    it('should log welcome order creation with trace context', async () => {
      const savedOrder = createMockOrder({ userId });
      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      await service.createOrderForUser(userId);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Auto-creating order for new user: ${userId}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'OrdersService',
      );
    });

    it('should use provided headers traceId and requestId', async () => {
      const savedOrder = createMockOrder({ userId });
      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      const headers = {
        traceId: 'custom-trace-id',
        requestId: 'custom-request-id',
      };

      await service.createOrderForUser(userId, headers);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Auto-creating order for new user: ${userId}`,
        'custom-request-id',
        'custom-trace-id',
        expect.any(String),
        'OrdersService',
      );
    });

    it('should publish order.created event for welcome order', async () => {
      const savedOrder = createMockOrder({
        userId,
        items: [
          {
            productId: 'welcome-product',
            quantity: 1,
            price: 0,
          },
        ],
        totalAmount: 0,
      });

      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      await service.createOrderForUser(userId);

      expect(kafkaService.emit).toHaveBeenCalledWith(
        'order.created',
        expect.objectContaining({
          userId,
          orderId: savedOrder.id,
        }),
        expect.any(Object),
      );
    });

    it('should call create method with welcome order data', async () => {
      const savedOrder = createMockOrder({ userId });
      orderRepository.create.mockReturnValue(savedOrder);
      orderRepository.save.mockResolvedValue(savedOrder);

      const createSpy = jest.spyOn(service, 'create');

      await service.createOrderForUser(userId);

      expect(createSpy).toHaveBeenCalledWith(
        {
          userId,
          items: [
            {
              productId: 'welcome-product',
              quantity: 1,
              price: 0,
            },
          ],
        },
        'mock-uuid',
      );
    });
  });
});
