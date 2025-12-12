import { Test, TestingModule } from '@nestjs/testing';

import { PaymentsService } from './payments.service';
import { ConfluentKafkaService } from '../kafka/confluent-kafka.service';
import { LoggerService } from '../observability/logger.service';
import { createMockKafkaService } from '../../test/mocks/kafka.mock';
import { createMockLogger } from '../../test/mocks/logger.mock';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('PaymentsService', () => {
  let service: PaymentsService;
  let kafkaService: ReturnType<typeof createMockKafkaService>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    kafkaService = createMockKafkaService();
    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
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

    service = module.get<PaymentsService>(PaymentsService);

    // Mock setTimeout to avoid actual delays in tests
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return {} as any;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('processPayment', () => {
    const orderId = 'order-123';
    const userId = 'user-456';
    const amount = 100.5;

    it('should process payment and return paymentId and status', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Success case

      const result = await service.processPayment(orderId, userId, amount);

      expect(result).toEqual({
        paymentId: 'mock-uuid',
        status: 'completed',
      });
    });

    it('should return completed status when random > 0.1', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = await service.processPayment(orderId, userId, amount);

      expect(result.status).toBe('completed');
    });

    it('should return failed status when random <= 0.1', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.05);

      const result = await service.processPayment(orderId, userId, amount);

      expect(result.status).toBe('failed');
    });

    it('should publish payment.completed event with success status', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await service.processPayment(orderId, userId, amount);

      expect(kafkaService.emit).toHaveBeenCalledWith(
        'payment.completed',
        {
          paymentId: 'mock-uuid',
          orderId,
          userId,
          amount,
          status: 'completed',
          completedAt: expect.any(String),
        },
        {
          requestId: 'mock-uuid',
          traceId: 'mock-uuid',
          spanId: 'mock-uuid',
        },
      );
    });

    it('should publish payment.completed event with failed status', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.05);

      await service.processPayment(orderId, userId, amount);

      expect(kafkaService.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          status: 'failed',
        }),
        expect.any(Object),
      );
    });

    it('should include orderId in event payload', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await service.processPayment(orderId, userId, amount);

      expect(kafkaService.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          orderId: 'order-123',
        }),
        expect.any(Object),
      );
    });

    it('should include userId in event payload', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await service.processPayment(orderId, userId, amount);

      expect(kafkaService.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          userId: 'user-456',
        }),
        expect.any(Object),
      );
    });

    it('should include amount in event payload', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await service.processPayment(orderId, userId, amount);

      expect(kafkaService.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          amount: 100.5,
        }),
        expect.any(Object),
      );
    });

    it('should generate unique paymentId', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = await service.processPayment(orderId, userId, amount);

      expect(result.paymentId).toBe('mock-uuid');
    });

    it('should log payment processing start with trace context', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await service.processPayment(orderId, userId, amount);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Processing payment for order: ${orderId}, amount: ${amount}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'PaymentsService',
        { orderId, userId, amount },
      );
    });

    it('should log payment processing completion with trace context', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await service.processPayment(orderId, userId, amount);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        'Payment processed: mock-uuid, status: completed',
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'PaymentsService',
        { paymentId: 'mock-uuid', status: 'completed' },
      );
    });

    it('should log payment event published with trace context', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await service.processPayment(orderId, userId, amount);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        'Payment event published: mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'PaymentsService',
      );
    });

    it('should use provided headers traceId and requestId', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const headers = {
        traceId: 'custom-trace-id',
        requestId: 'custom-request-id',
      };

      await service.processPayment(orderId, userId, amount, headers);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        expect.any(String),
        'custom-request-id',
        'custom-trace-id',
        expect.any(String),
        'PaymentsService',
        expect.any(Object),
      );
    });

    it('should propagate trace context in event', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const headers = {
        traceId: 'custom-trace-id',
        requestId: 'custom-request-id',
      };

      await service.processPayment(orderId, userId, amount, headers);

      expect(kafkaService.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.any(Object),
        {
          requestId: 'custom-request-id',
          traceId: 'custom-trace-id',
          spanId: expect.any(String),
        },
      );
    });

    it('should handle zero amount orders', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = await service.processPayment(orderId, userId, 0);

      expect(result.paymentId).toBeDefined();
      expect(result.status).toBe('completed');
      expect(kafkaService.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          amount: 0,
        }),
        expect.any(Object),
      );
    });

    it('should handle large amount orders', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const largeAmount = 999999.99;
      const result = await service.processPayment(orderId, userId, largeAmount);

      expect(result.paymentId).toBeDefined();
      expect(kafkaService.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          amount: largeAmount,
        }),
        expect.any(Object),
      );
    });

    it('should include completedAt timestamp in ISO format', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const mockDate = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      await service.processPayment(orderId, userId, amount);

      expect(kafkaService.emit).toHaveBeenCalledWith(
        'payment.completed',
        expect.objectContaining({
          completedAt: '2024-01-01T12:00:00.000Z',
        }),
        expect.any(Object),
      );
    });

    it('should call setTimeout for payment delay simulation', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await service.processPayment(orderId, userId, amount);

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });
  });
});
