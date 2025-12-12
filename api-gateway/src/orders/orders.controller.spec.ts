import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3002'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create an order and return the created order', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: '1',
        items: [
          {
            productId: 'product-123',
            quantity: 2,
            price: 99.99,
          },
        ],
      };

      const createdOrder = {
        id: 'order-1',
        ...createOrderDto,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const mockRequest = {
        headers: {},
      } as any;

      mockHttpService.post.mockReturnValue(of({ data: createdOrder }));

      const result = await controller.createOrder(createOrderDto, mockRequest);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3002/orders',
        createOrderDto,
        { headers: {} },
      );
      expect(result).toEqual(createdOrder);
    });

    it('should forward X-Request-Id header when provided', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: '1',
        items: [
          {
            productId: 'product-123',
            quantity: 1,
            price: 50.0,
          },
        ],
      };

      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id-123',
        },
      } as any;

      mockHttpService.post.mockReturnValue(
        of({ data: { id: 'order-1', ...createOrderDto } }),
      );

      await controller.createOrder(createOrderDto, mockRequest);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3002/orders',
        createOrderDto,
        { headers: { 'X-Request-Id': 'test-request-id-123' } },
      );
    });

    it('should handle order creation errors', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: '1',
        items: [
          {
            productId: 'product-123',
            quantity: 1,
            price: 50.0,
          },
        ],
      };

      const mockRequest = { headers: {} } as any;
      const error = new Error('Order service unavailable');
      mockHttpService.post.mockReturnValue(
        throwError(() => error),
      );

      await expect(
        controller.createOrder(createOrderDto, mockRequest),
      ).rejects.toThrow(error);
    });
  });

  describe('getAllOrders', () => {
    it('should return all orders', async () => {
      const orders = [
        { id: 'order-1', userId: '1', productId: 'prod-1', quantity: 1 },
        { id: 'order-2', userId: '2', productId: 'prod-2', quantity: 2 },
      ];

      const mockRequest = { headers: {} } as any;
      const mockUser = { id: '1', role: 'admin' };

      mockHttpService.get.mockReturnValue(of({ data: orders }));

      const result = await controller.getAllOrders(mockRequest, mockUser);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3002/orders',
        { headers: {} },
      );
      expect(result).toEqual(orders);
    });

    it('should forward X-Request-Id header when getting all orders', async () => {
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id-456',
        },
      } as any;

      const mockUser = { id: '1', role: 'user' };
      mockHttpService.get.mockReturnValue(of({ data: [] }));

      await controller.getAllOrders(mockRequest, mockUser);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3002/orders',
        { headers: { 'X-Request-Id': 'test-request-id-456' } },
      );
    });

    it('should handle errors when fetching orders', async () => {
      const mockRequest = { headers: {} } as any;
      const mockUser = { id: '1', role: 'user' };
      const error = new Error('Service unavailable');

      mockHttpService.get.mockReturnValue(
        throwError(() => error),
      );

      await expect(
        controller.getAllOrders(mockRequest, mockUser),
      ).rejects.toThrow(error);
    });
  });

  describe('getOrderById', () => {
    it('should return order by id', async () => {
      const orderId = 'order-123';
      const order = {
        id: orderId,
        userId: '1',
        productId: 'prod-1',
        quantity: 1,
        price: 99.99,
      };

      const mockRequest = { headers: {} } as any;
      mockHttpService.get.mockReturnValue(of({ data: order }));

      const result = await controller.getOrderById(orderId, mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        `http://localhost:3002/orders/${orderId}`,
        { headers: {} },
      );
      expect(result).toEqual(order);
    });

    it('should forward X-Request-Id header when getting order by id', async () => {
      const orderId = 'order-123';
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id-789',
        },
      } as any;

      mockHttpService.get.mockReturnValue(
        of({ data: { id: orderId } }),
      );

      await controller.getOrderById(orderId, mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        `http://localhost:3002/orders/${orderId}`,
        { headers: { 'X-Request-Id': 'test-request-id-789' } },
      );
    });

    it('should handle order not found', async () => {
      const orderId = 'non-existent-order';
      const mockRequest = { headers: {} } as any;
      const error = new Error('Order not found');

      mockHttpService.get.mockReturnValue(
        throwError(() => error),
      );

      await expect(
        controller.getOrderById(orderId, mockRequest),
      ).rejects.toThrow(error);
    });

    it('should use custom order service URL from config', async () => {
      mockConfigService.get.mockReturnValue('http://custom-order-service:8080');

      const module: TestingModule = await Test.createTestingModule({
        controllers: [OrdersController],
        providers: [
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const newController = module.get<OrdersController>(OrdersController);
      const mockRequest = { headers: {} } as any;

      mockHttpService.get.mockReturnValue(of({ data: { id: 'order-1' } }));

      await newController.getOrderById('order-1', mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://custom-order-service:8080/orders/order-1',
        { headers: {} },
      );
    });
  });
});
