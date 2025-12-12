import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { OrdersService } from '../src/orders/orders.service';
import { Order } from '../src/orders/entities/order.entity';
import { ConfluentKafkaService } from '../src/kafka/confluent-kafka.service';
import { LoggerService } from '../src/observability/logger.service';
import { createMockKafkaService } from './mocks/kafka.mock';
import { createMockLogger } from './mocks/logger.mock';
import { v4 as uuidv4 } from 'uuid';

describe('OrdersService Integration Tests', () => {
  let service: OrdersService;
  let dataSource: DataSource;
  let module: TestingModule;

  beforeAll(async () => {
    // Load test environment variables
    process.env.DB_NAME = process.env.DB_NAME || 'orderdb_test';
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_PORT = process.env.DB_PORT || '5435';
    process.env.DB_USERNAME = process.env.DB_USERNAME || 'postgres';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          ignoreEnvFile: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5435'),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            entities: [Order],
            synchronize: true, // Auto-create tables
            dropSchema: true, // Drop schema before tests
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([Order]),
      ],
      providers: [
        OrdersService,
        {
          provide: ConfluentKafkaService,
          useValue: createMockKafkaService(),
        },
        {
          provide: LoggerService,
          useValue: createMockLogger(),
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // Clean up database connection
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await module.close();
  });

  beforeEach(async () => {
    // Clear all tables before each test
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }
  });

  describe('create() - Real Database', () => {
    it('should create an order and persist to PostgreSQL database', async () => {
      const createOrderDto = {
        userId: 'user-123',
        items: [
          {
            productId: 'product-123',
            quantity: 2,
            price: 10.5,
          },
          {
            productId: 'product-456',
            quantity: 1,
            price: 25.0,
          },
        ],
      };

      const order = await service.create(createOrderDto);

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.userId).toBe(createOrderDto.userId);
      expect(order.items).toEqual(createOrderDto.items);
      expect(parseFloat(order.totalAmount.toString())).toBe(46.0); // 2 * 10.5 + 1 * 25.0
      expect(order.createdAt).toBeDefined();

      // Verify order exists in database
      const foundOrder = await service.findOne(order.id);
      expect(foundOrder).toBeDefined();
      expect(foundOrder.userId).toBe(createOrderDto.userId);
      expect(parseFloat(foundOrder.totalAmount.toString())).toBe(46.0);
    });

    it('should calculate total amount correctly for multiple items', async () => {
      const createOrderDto = {
        userId: 'user-456',
        items: [
          {
            productId: 'product-1',
            quantity: 3,
            price: 5.99,
          },
          {
            productId: 'product-2',
            quantity: 2,
            price: 12.50,
          },
          {
            productId: 'product-3',
            quantity: 1,
            price: 99.99,
          },
        ],
      };

      const order = await service.create(createOrderDto);
      const expectedTotal = 3 * 5.99 + 2 * 12.50 + 1 * 99.99; // 17.97 + 25.00 + 99.99 = 142.96

      expect(parseFloat(order.totalAmount.toString())).toBeCloseTo(expectedTotal, 2);
    });

    it('should handle single item order', async () => {
      const createOrderDto = {
        userId: 'user-789',
        items: [
          {
            productId: 'product-single',
            quantity: 1,
            price: 50.0,
          },
        ],
      };

      const order = await service.create(createOrderDto);

      expect(parseFloat(order.totalAmount.toString())).toBe(50.0);
      expect(order.items.length).toBe(1);
    });

    it('should handle decimal prices correctly', async () => {
      const createOrderDto = {
        userId: 'user-decimal',
        items: [
          {
            productId: 'product-decimal',
            quantity: 2,
            price: 19.99,
          },
        ],
      };

      const order = await service.create(createOrderDto);
      const expectedTotal = 2 * 19.99; // 39.98

      expect(parseFloat(order.totalAmount.toString())).toBeCloseTo(expectedTotal, 2);
    });

    it('should persist JSONB items array correctly', async () => {
      const createOrderDto = {
        userId: 'user-jsonb',
        items: [
          {
            productId: 'product-1',
            quantity: 1,
            price: 10.0,
          },
          {
            productId: 'product-2',
            quantity: 2,
            price: 20.0,
          },
        ],
      };

      const order = await service.create(createOrderDto);

      // Verify items are stored as JSONB
      const foundOrder = await service.findOne(order.id);
      expect(foundOrder.items).toEqual(createOrderDto.items);
      expect(Array.isArray(foundOrder.items)).toBe(true);
      expect(foundOrder.items[0].productId).toBe('product-1');
      expect(foundOrder.items[1].quantity).toBe(2);
    });
  });

  describe('findAll() - Real Database', () => {
    it('should return all orders from database', async () => {
      // Create multiple orders
      await service.create({
        userId: 'user-1',
        items: [{ productId: 'prod-1', quantity: 1, price: 10.0 }],
      });
      await service.create({
        userId: 'user-2',
        items: [{ productId: 'prod-2', quantity: 2, price: 20.0 }],
      });
      await service.create({
        userId: 'user-3',
        items: [{ productId: 'prod-3', quantity: 3, price: 30.0 }],
      });

      const orders = await service.findAll();

      expect(orders.length).toBe(3);
      // Verify all orders are present
      const userIds = orders.map((o) => o.userId);
      expect(userIds).toContain('user-1');
      expect(userIds).toContain('user-2');
      expect(userIds).toContain('user-3');
    });

    it('should return empty array when no orders exist', async () => {
      const orders = await service.findAll();
      expect(orders).toEqual([]);
    });
  });

  describe('findOne() - Real Database', () => {
    it('should find order by ID from database', async () => {
      const createdOrder = await service.create({
        userId: 'user-find',
        items: [
          {
            productId: 'product-find',
            quantity: 5,
            price: 15.0,
          },
        ],
      });

      const foundOrder = await service.findOne(createdOrder.id);

      expect(foundOrder).toBeDefined();
      expect(foundOrder.id).toBe(createdOrder.id);
      expect(foundOrder.userId).toBe('user-find');
      expect(parseFloat(foundOrder.totalAmount.toString())).toBe(75.0); // 5 * 15.0
      expect(foundOrder.items.length).toBe(1);
    });

    it('should return null for non-existent order', async () => {
      const nonExistentId = uuidv4(); // Valid UUID that doesn't exist
      const foundOrder = await service.findOne(nonExistentId);
      expect(foundOrder).toBeNull();
    });
  });

  describe('createOrderForUser() - Real Database', () => {
    it('should create welcome order for user', async () => {
      const userId = 'new-user-123';
      const headers = {
        requestId: 'req-123',
        traceId: 'trace-123',
      };

      const order = await service.createOrderForUser(userId, headers);

      expect(order).toBeDefined();
      expect(order.userId).toBe(userId);
      expect(order.items.length).toBe(1);
      expect(order.items[0].productId).toBe('welcome-product');
      expect(order.items[0].quantity).toBe(1);
      expect(order.items[0].price).toBe(0);
      expect(parseFloat(order.totalAmount.toString())).toBe(0);

      // Verify order is persisted
      const foundOrder = await service.findOne(order.id);
      expect(foundOrder).toBeDefined();
      expect(foundOrder.userId).toBe(userId);
    });

    it('should create welcome order without headers', async () => {
      const userId = 'new-user-456';

      const order = await service.createOrderForUser(userId);

      expect(order).toBeDefined();
      expect(order.userId).toBe(userId);
      expect(order.items[0].productId).toBe('welcome-product');
    });

    it('should create multiple welcome orders for different users', async () => {
      const userId1 = 'user-welcome-1';
      const userId2 = 'user-welcome-2';

      const order1 = await service.createOrderForUser(userId1);
      const order2 = await service.createOrderForUser(userId2);

      expect(order1.userId).toBe(userId1);
      expect(order2.userId).toBe(userId2);
      expect(order1.id).not.toBe(order2.id);

      // Verify both orders exist
      const allOrders = await service.findAll();
      expect(allOrders.length).toBe(2);
    });
  });

  describe('Database Constraints - Real Database', () => {
    it('should handle large order items array', async () => {
      const largeItems = Array.from({ length: 100 }, (_, i) => ({
        productId: `product-${i}`,
        quantity: i + 1,
        price: (i + 1) * 1.5,
      }));

      const createOrderDto = {
        userId: 'user-large',
        items: largeItems,
      };

      const order = await service.create(createOrderDto);

      expect(order.items.length).toBe(100);
      expect(order.items[0].productId).toBe('product-0');
      expect(order.items[99].productId).toBe('product-99');

      // Verify persisted
      const foundOrder = await service.findOne(order.id);
      expect(foundOrder.items.length).toBe(100);
    });

    it('should handle zero quantity', async () => {
      const createOrderDto = {
        userId: 'user-zero',
        items: [
          {
            productId: 'product-zero',
            quantity: 0,
            price: 10.0,
          },
        ],
      };

      const order = await service.create(createOrderDto);
      expect(parseFloat(order.totalAmount.toString())).toBe(0);
    });

    it('should handle zero price', async () => {
      const createOrderDto = {
        userId: 'user-free',
        items: [
          {
            productId: 'product-free',
            quantity: 5,
            price: 0,
          },
        ],
      };

      const order = await service.create(createOrderDto);
      expect(parseFloat(order.totalAmount.toString())).toBe(0);
    });
  });
});
