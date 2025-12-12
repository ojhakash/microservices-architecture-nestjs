import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotFoundException } from '@nestjs/common';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 'user-123',
        items: [
          {
            productId: 'product-456',
            quantity: 2,
            price: 99.99,
          },
        ],
      };

      const createdOrder = {
        id: 'order-123',
        ...createOrderDto,
        status: 'pending',
        createdAt: new Date(),
      };

      mockOrdersService.create.mockResolvedValue(createdOrder);

      const result = await controller.create(createOrderDto);

      expect(service.create).toHaveBeenCalledWith(createOrderDto, undefined);
      expect(result).toEqual(createdOrder);
    });

    it('should create an order with request ID', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 'user-123',
        items: [
          {
            productId: 'product-456',
            quantity: 1,
            price: 50.0,
          },
        ],
      };

      const requestId = 'test-request-id-123';
      const createdOrder = { id: 'order-123', ...createOrderDto };

      mockOrdersService.create.mockResolvedValue(createdOrder);

      const result = await controller.create(createOrderDto, requestId);

      expect(service.create).toHaveBeenCalledWith(createOrderDto, requestId);
      expect(result).toEqual(createdOrder);
    });

    it('should handle service errors during order creation', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 'user-123',
        items: [
          {
            productId: 'product-456',
            quantity: 1,
            price: 50.0,
          },
        ],
      };

      const error = new Error('Database error');
      mockOrdersService.create.mockRejectedValue(error);

      await expect(controller.create(createOrderDto)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      const orders = [
        {
          id: 'order-1',
          userId: 'user-1',
          productId: 'prod-1',
          quantity: 1,
          price: 10.0,
        },
        {
          id: 'order-2',
          userId: 'user-2',
          productId: 'prod-2',
          quantity: 2,
          price: 20.0,
        },
      ];

      mockOrdersService.findAll.mockResolvedValue(orders);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(orders);
    });

    it('should return all orders with request ID', async () => {
      const orders = [{ id: 'order-1' }];
      const requestId = 'test-request-id-456';

      mockOrdersService.findAll.mockResolvedValue(orders);

      const result = await controller.findAll(requestId);

      expect(service.findAll).toHaveBeenCalledWith(requestId);
      expect(result).toEqual(orders);
    });

    it('should return empty array when no orders exist', async () => {
      mockOrdersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });

    it('should handle service errors during findAll', async () => {
      const error = new Error('Database error');
      mockOrdersService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const orderId = 'order-123';
      const order = {
        id: orderId,
        userId: 'user-123',
        productId: 'prod-456',
        quantity: 1,
        price: 50.0,
      };

      mockOrdersService.findOne.mockResolvedValue(order);

      const result = await controller.findOne(orderId);

      expect(service.findOne).toHaveBeenCalledWith(orderId, undefined);
      expect(result).toEqual(order);
    });

    it('should return an order by id with request ID', async () => {
      const orderId = 'order-123';
      const requestId = 'test-request-id-789';
      const order = { id: orderId, userId: 'user-123' };

      mockOrdersService.findOne.mockResolvedValue(order);

      const result = await controller.findOne(orderId, requestId);

      expect(service.findOne).toHaveBeenCalledWith(orderId, requestId);
      expect(result).toEqual(order);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      const orderId = 'non-existent-order';

      mockOrdersService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(orderId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findOne(orderId)).rejects.toThrow(
        `Order with ID ${orderId} not found`,
      );
    });

    it('should throw NotFoundException when order is undefined', async () => {
      const orderId = 'undefined-order';

      mockOrdersService.findOne.mockResolvedValue(undefined);

      await expect(controller.findOne(orderId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle service errors during findOne', async () => {
      const orderId = 'order-123';
      const error = new Error('Database error');

      mockOrdersService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(orderId)).rejects.toThrow(error);
    });
  });
});
