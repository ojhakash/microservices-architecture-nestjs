import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/entities/user.entity';
import { ConfluentKafkaService } from '../src/kafka/confluent-kafka.service';
import { LoggerService } from '../src/observability/logger.service';
import { createMockKafkaService } from './mocks/kafka.mock';
import { createMockLogger } from './mocks/logger.mock';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

describe('UsersService Integration Tests', () => {
  let service: UsersService;
  let dataSource: DataSource;
  let module: TestingModule;
  let configService: ConfigService;

  beforeAll(async () => {
    // Load test environment variables
    process.env.DB_NAME = process.env.DB_NAME || 'userdb_test';
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
            entities: [User],
            synchronize: true, // Auto-create tables
            dropSchema: true, // Drop schema before tests
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [
        UsersService,
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

    service = module.get<UsersService>(UsersService);
    dataSource = module.get<DataSource>(DataSource);
    configService = module.get<ConfigService>(ConfigService);
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
    it('should create a user and persist to PostgreSQL database', async () => {
      const createUserDto = {
        email: 'integration-test@example.com',
        name: 'Integration Test User',
        password: 'password123',
        role: 'user',
      };

      const user = await service.create(createUserDto);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(createUserDto.email);
      expect(user.name).toBe(createUserDto.name);
      expect(user.role).toBe('user');
      expect(user.password).not.toBe(createUserDto.password); // Should be hashed
      expect(user.createdAt).toBeDefined();

      // Verify password is hashed
      const isPasswordHashed = await bcrypt.compare(
        createUserDto.password,
        user.password,
      );
      expect(isPasswordHashed).toBe(true);

      // Verify user exists in database by querying directly
      const foundUser = await service.findOne(user.id);
      expect(foundUser).toBeDefined();
      expect(foundUser.email).toBe(createUserDto.email);
    });

    it('should enforce unique email constraint', async () => {
      const createUserDto = {
        email: 'duplicate@example.com',
        name: 'User 1',
        password: 'password123',
      };

      await service.create(createUserDto);

      // Try to create another user with same email
      await expect(
        service.create({
          ...createUserDto,
          name: 'User 2',
        }),
      ).rejects.toThrow();
    });

    it('should create admin user with admin role', async () => {
      const createUserDto = {
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'admin123',
        role: 'admin',
      };

      const user = await service.create(createUserDto);

      expect(user.role).toBe('admin');
      const foundUser = await service.findOne(user.id);
      expect(foundUser.role).toBe('admin');
    });

    it('should default to user role when role not provided', async () => {
      const createUserDto = {
        email: 'default-role@example.com',
        name: 'Default Role User',
        password: 'password123',
      };

      const user = await service.create(createUserDto);

      expect(user.role).toBe('user');
    });
  });

  describe('findAll() - Real Database', () => {
    it('should return all users from database', async () => {
      // Create multiple users
      await service.create({
        email: 'user1@example.com',
        name: 'User 1',
        password: 'pass123',
      });
      await service.create({
        email: 'user2@example.com',
        name: 'User 2',
        password: 'pass123',
      });
      await service.create({
        email: 'user3@example.com',
        name: 'User 3',
        password: 'pass123',
      });

      const users = await service.findAll();

      expect(users.length).toBe(3);
      // Verify passwords are excluded
      users.forEach((user) => {
        expect('password' in user).toBe(false);
      });
      // Verify all users are present
      const emails = users.map((u) => u.email);
      expect(emails).toContain('user1@example.com');
      expect(emails).toContain('user2@example.com');
      expect(emails).toContain('user3@example.com');
    });

    it('should return empty array when no users exist', async () => {
      const users = await service.findAll();
      expect(users).toEqual([]);
    });
  });

  describe('findOne() - Real Database', () => {
    it('should find user by ID from database', async () => {
      const createdUser = await service.create({
        email: 'findme@example.com',
        name: 'Find Me',
        password: 'pass123',
      });

      const foundUser = await service.findOne(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe('findme@example.com');
      expect(foundUser.name).toBe('Find Me');
      expect('password' in foundUser).toBe(false); // Password should be excluded
    });

    it('should return null for non-existent user', async () => {
      const nonExistentId = uuidv4(); // Valid UUID that doesn't exist
      const foundUser = await service.findOne(nonExistentId);
      expect(foundUser).toBeNull();
    });
  });

  describe('findByEmail() - Real Database', () => {
    it('should find user by email from database', async () => {
      const createdUser = await service.create({
        email: 'email-search@example.com',
        name: 'Email Search',
        password: 'pass123',
      });

      const foundUser = await service.findByEmail('email-search@example.com');

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe('email-search@example.com');
      expect(foundUser.password).toBeDefined(); // Password included for auth purposes
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await service.findByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('hasAnyAdmin() - Real Database', () => {
    it('should return false when no admin exists', async () => {
      await service.create({
        email: 'user1@example.com',
        name: 'User 1',
        password: 'pass123',
        role: 'user',
      });

      const hasAdmin = await service.hasAnyAdmin();
      expect(hasAdmin).toBe(false);
    });

    it('should return true when admin exists', async () => {
      await service.create({
        email: 'admin@example.com',
        name: 'Admin',
        password: 'admin123',
        role: 'admin',
      });

      const hasAdmin = await service.hasAnyAdmin();
      expect(hasAdmin).toBe(true);
    });

    it('should return true when multiple admins exist', async () => {
      await service.create({
        email: 'admin1@example.com',
        name: 'Admin 1',
        password: 'admin123',
        role: 'admin',
      });
      await service.create({
        email: 'admin2@example.com',
        name: 'Admin 2',
        password: 'admin123',
        role: 'admin',
      });

      const hasAdmin = await service.hasAnyAdmin();
      expect(hasAdmin).toBe(true);
    });
  });

  describe('update() - Real Database', () => {
    it('should update user in database', async () => {
      const user = await service.create({
        email: 'update@example.com',
        name: 'Original Name',
        password: 'pass123',
      });

      const updatedUser = await service.update(user.id, {
        name: 'Updated Name',
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.email).toBe('update@example.com');

      // Verify in database
      const foundUser = await service.findOne(user.id);
      expect(foundUser.name).toBe('Updated Name');
    });

    it('should update email in database', async () => {
      const user = await service.create({
        email: 'old-email@example.com',
        name: 'User',
        password: 'pass123',
      });

      const updatedUser = await service.update(user.id, {
        email: 'new-email@example.com',
      });

      expect(updatedUser.email).toBe('new-email@example.com');

      // Verify in database
      const foundUser = await service.findOne(user.id);
      expect(foundUser.email).toBe('new-email@example.com');
    });

    it('should hash password when updating password', async () => {
      const user = await service.create({
        email: 'password-update@example.com',
        name: 'User',
        password: 'oldpassword',
      });

      const updatedUser = await service.update(user.id, {
        password: 'newpassword',
      });

      // Verify password is hashed
      const foundUser = await service.findByEmail('password-update@example.com');
      const isNewPassword = await bcrypt.compare(
        'newpassword',
        foundUser.password,
      );
      expect(isNewPassword).toBe(true);
    });

    it('should return null when updating non-existent user', async () => {
      const nonExistentId = uuidv4(); // Valid UUID that doesn't exist
      const updatedUser = await service.update(nonExistentId, {
        name: 'Updated',
      });
      expect(updatedUser).toBeNull();
    });
  });

  describe('remove() - Real Database', () => {
    it('should delete user from database', async () => {
      const user = await service.create({
        email: 'delete@example.com',
        name: 'Delete Me',
        password: 'pass123',
      });

      await service.remove(user.id);

      // Verify deleted
      const foundUser = await service.findOne(user.id);
      expect(foundUser).toBeNull();
    });

    it('should not throw error when deleting non-existent user', async () => {
      const nonExistentId = uuidv4(); // Valid UUID that doesn't exist
      await expect(
        service.remove(nonExistentId),
      ).resolves.not.toThrow();
    });
  });
});
