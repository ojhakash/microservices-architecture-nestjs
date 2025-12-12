import { Test, TestingModule } from '@nestjs/testing';
import { OrderCreatedConsumer } from './order-created.consumer';
import { PaymentsService } from '../payments.service';
import { LoggerService } from '../../observability/logger.service';
import { OrderCreatedEvent } from '../../../../shared/events/order.events';
import { KafkaContext } from '@nestjs/microservices';

describe('OrderCreatedConsumer', () => {
  let consumer: OrderCreatedConsumer;
  let paymentsService: PaymentsService;
  let loggerService: LoggerService;

  const mockPaymentsService = {
    processPayment: jest.fn(),
  };

  const mockLoggerService = {
    logWithTrace: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderCreatedConsumer],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    consumer = module.get<OrderCreatedConsumer>(OrderCreatedConsumer);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleOrderCreated', () => {
    it('should process order.created event and handle payment', async () => {
      const event: OrderCreatedEvent = {
        orderId: 'order-123',
        userId: 'user-456',
        items: [
          {
            productId: 'product-789',
            quantity: 2,
            price: 99.99,
          },
        ],
        totalAmount: 199.98,
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

      mockPaymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-123',
        orderId: event.orderId,
        status: 'completed',
      });

      await consumer.handleOrderCreated(payload, mockContext);

      expect(paymentsService.processPayment).toHaveBeenCalledWith(
        event.orderId,
        event.userId,
        event.totalAmount,
        payload.headers,
      );
      expect(loggerService.logWithTrace).toHaveBeenCalledTimes(2);
      expect(loggerService.logWithTrace).toHaveBeenCalledWith(
        `Received order.created event for order: ${event.orderId}`,
        'request-123',
        'trace-123',
        expect.any(String),
        'OrderCreatedConsumer',
        {
          orderId: event.orderId,
          userId: event.userId,
          totalAmount: event.totalAmount,
        },
      );
      expect(loggerService.logWithTrace).toHaveBeenCalledWith(
        `Successfully processed payment for order: ${event.orderId}`,
        'request-123',
        'trace-123',
        expect.any(String),
        'OrderCreatedConsumer',
      );
    });

    it('should generate trace IDs when not provided in headers', async () => {
      const event: OrderCreatedEvent = {
        orderId: 'order-456',
        userId: 'user-789',
        items: [
          {
            productId: 'product-012',
            quantity: 1,
            price: 50.0,
          },
        ],
        totalAmount: 50.0,
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
        headers: {},
      };

      const mockContext = {} as KafkaContext;

      mockPaymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-456',
      });

      await consumer.handleOrderCreated(payload, mockContext);

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
      const event: OrderCreatedEvent = {
        orderId: 'order-789',
        userId: 'user-012',
        items: [
          {
            productId: 'product-345',
            quantity: 3,
            price: 25.0,
          },
        ],
        totalAmount: 75.0,
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
      } as any;

      const mockContext = {} as KafkaContext;

      mockPaymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-789',
      });

      await consumer.handleOrderCreated(payload, mockContext);

      expect(paymentsService.processPayment).toHaveBeenCalledWith(
        event.orderId,
        event.userId,
        event.totalAmount,
        {},
      );
    });

    it('should log error when payment processing fails', async () => {
      const event: OrderCreatedEvent = {
        orderId: 'order-error',
        userId: 'user-error',
        items: [
          {
            productId: 'product-error',
            quantity: 1,
            price: 100.0,
          },
        ],
        totalAmount: 100.0,
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
      const error = new Error('Payment gateway unavailable');

      mockPaymentsService.processPayment.mockRejectedValue(error);

      await consumer.handleOrderCreated(payload, mockContext);

      expect(loggerService.error).toHaveBeenCalledWith(
        `Failed to process payment for order ${event.orderId}`,
        error.stack,
        'OrderCreatedConsumer',
        { orderId: event.orderId, error: error.message },
      );
    });

    it('should continue processing despite payment error', async () => {
      const event: OrderCreatedEvent = {
        orderId: 'order-continue',
        userId: 'user-continue',
        items: [
          {
            productId: 'product-continue',
            quantity: 1,
            price: 50.0,
          },
        ],
        totalAmount: 50.0,
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
        headers: {},
      };

      const mockContext = {} as KafkaContext;
      const error = new Error('Payment processing failed');

      mockPaymentsService.processPayment.mockRejectedValue(error);

      // Should not throw
      await expect(
        consumer.handleOrderCreated(payload, mockContext),
      ).resolves.not.toThrow();

      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should include event details in log context', async () => {
      const event: OrderCreatedEvent = {
        orderId: 'order-details',
        userId: 'user-details',
        items: [
          {
            productId: 'product-details',
            quantity: 5,
            price: 20.0,
          },
        ],
        totalAmount: 100.0,
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
        headers: {},
      };

      const mockContext = {} as KafkaContext;

      mockPaymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-details',
      });

      await consumer.handleOrderCreated(payload, mockContext);

      expect(loggerService.logWithTrace).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'OrderCreatedConsumer',
        expect.objectContaining({
          orderId: event.orderId,
          userId: event.userId,
          totalAmount: event.totalAmount,
        }),
      );
    });

    it('should process payment with correct amount', async () => {
      const event: OrderCreatedEvent = {
        orderId: 'order-amount',
        userId: 'user-amount',
        items: [
          {
            productId: 'product-amount',
            quantity: 10,
            price: 15.99,
          },
        ],
        totalAmount: 159.9,
        createdAt: new Date().toISOString(),
      };

      const payload = {
        value: event,
        headers: {},
      };

      const mockContext = {} as KafkaContext;

      mockPaymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-amount',
      });

      await consumer.handleOrderCreated(payload, mockContext);

      expect(paymentsService.processPayment).toHaveBeenCalledWith(
        event.orderId,
        event.userId,
        159.9,
        expect.any(Object),
      );
    });
  });
});
