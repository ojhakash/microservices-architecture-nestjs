import { Test, TestingModule } from '@nestjs/testing';
import { UserCreatedConsumer } from './user-created.consumer';
import { OrdersService } from '../orders.service';
import { LoggerService } from '../../observability/logger.service';
import { UserCreatedEvent } from '../../../../shared/events/user.events';
import { KafkaContext } from '@nestjs/microservices';

describe('UserCreatedConsumer', () => {
  let consumer: UserCreatedConsumer;
  let ordersService: OrdersService;
  let loggerService: LoggerService;

  const mockOrdersService = {
    createOrderForUser: jest.fn(),
  };

  const mockLoggerService = {
    logWithTrace: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserCreatedConsumer],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    consumer = module.get<UserCreatedConsumer>(UserCreatedConsumer);
    ordersService = module.get<OrdersService>(OrdersService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleUserCreated', () => {
    it('should process user.created event and create welcome order', async () => {
      const event: UserCreatedEvent = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
        headers: {
          traceId: 'trace-123',
          requestId: 'request-123',
        },
      };

      const mockContext = {} as KafkaContext;

      mockOrdersService.createOrderForUser.mockResolvedValue({
        id: 'order-123',
        userId: event.userId,
      });

      await consumer.handleUserCreated(payload, mockContext);

      expect(ordersService.createOrderForUser).toHaveBeenCalledWith(
        event.userId,
        payload.headers,
      );
      expect(loggerService.logWithTrace).toHaveBeenCalledTimes(2);
      expect(loggerService.logWithTrace).toHaveBeenCalledWith(
        `Received user.created event for user: ${event.userId}`,
        'request-123',
        'trace-123',
        expect.any(String),
        'UserCreatedConsumer',
        { userId: event.userId, email: event.email },
      );
      expect(loggerService.logWithTrace).toHaveBeenCalledWith(
        `Successfully created welcome order for user: ${event.userId}`,
        'request-123',
        'trace-123',
        expect.any(String),
        'UserCreatedConsumer',
      );
    });

    it('should generate trace IDs when not provided in headers', async () => {
      const event: UserCreatedEvent = {
        userId: 'user-456',
        email: 'test2@example.com',
        name: 'Test User 2',
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
        headers: {},
      };

      const mockContext = {} as KafkaContext;

      mockOrdersService.createOrderForUser.mockResolvedValue({
        id: 'order-456',
      });

      await consumer.handleUserCreated(payload, mockContext);

      expect(loggerService.logWithTrace).toHaveBeenCalled();
      const logCall = mockLoggerService.logWithTrace.mock.calls[0];
      // Check that UUIDs were generated (they should be valid UUID v4 format)
      expect(logCall[1]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(logCall[2]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should handle undefined headers', async () => {
      const event: UserCreatedEvent = {
        userId: 'user-789',
        email: 'test3@example.com',
        name: 'Test User 3',
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
      } as any;

      const mockContext = {} as KafkaContext;

      mockOrdersService.createOrderForUser.mockResolvedValue({
        id: 'order-789',
      });

      await consumer.handleUserCreated(payload, mockContext);

      expect(ordersService.createOrderForUser).toHaveBeenCalledWith(
        event.userId,
        {},
      );
    });

    it('should log error when order creation fails', async () => {
      const event: UserCreatedEvent = {
        userId: 'user-error',
        email: 'error@example.com',
        name: 'Error User',
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
        headers: {
          traceId: 'trace-error',
          requestId: 'request-error',
        },
      };

      const mockContext = {} as KafkaContext;
      const error = new Error('Database connection failed');

      mockOrdersService.createOrderForUser.mockRejectedValue(error);

      await consumer.handleUserCreated(payload, mockContext);

      expect(loggerService.error).toHaveBeenCalledWith(
        `Failed to create order for user ${event.userId}`,
        error.stack,
        'UserCreatedConsumer',
        { userId: event.userId, error: error.message },
      );
    });

    it('should continue processing despite order creation error', async () => {
      const event: UserCreatedEvent = {
        userId: 'user-continue',
        email: 'continue@example.com',
        name: 'Continue User',
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
        headers: {},
      };

      const mockContext = {} as KafkaContext;
      const error = new Error('Order creation failed');

      mockOrdersService.createOrderForUser.mockRejectedValue(error);

      // Should not throw
      await expect(
        consumer.handleUserCreated(payload, mockContext),
      ).resolves.not.toThrow();

      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should include event details in log context', async () => {
      const event: UserCreatedEvent = {
        userId: 'user-details',
        email: 'details@example.com',
        name: 'Details User',
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
        headers: {},
      };

      const mockContext = {} as KafkaContext;

      mockOrdersService.createOrderForUser.mockResolvedValue({
        id: 'order-details',
      });

      await consumer.handleUserCreated(payload, mockContext);

      expect(loggerService.logWithTrace).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'UserCreatedConsumer',
        expect.objectContaining({
          userId: event.userId,
          email: event.email,
        }),
      );
    });
  });
});
