import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { ConfluentKafkaService } from '../kafka/confluent-kafka.service';
import { LoggerService } from '../observability/logger.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { createMockRepository } from '../../test/mocks/repository.mock';
import { createMockKafkaService } from '../../test/mocks/kafka.mock';
import { createMockLogger } from '../../test/mocks/logger.mock';
import { createMockUser } from '../../test/factories/user.factory';

jest.mock('bcrypt');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: ReturnType<typeof createMockRepository>;
  let kafkaService: ReturnType<typeof createMockKafkaService>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    userRepository = createMockRepository();
    kafkaService = createMockKafkaService();
    logger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
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

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123!',
    };

    it('should hash password and create user', async () => {
      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const savedUser = createMockUser({
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
        role: 'user',
      });

      userRepository.create.mockReturnValue(savedUser);
      userRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: hashedPassword,
        role: 'user',
      });
      expect(userRepository.save).toHaveBeenCalledWith(savedUser);
      expect(result).toEqual(savedUser);
    });

    it('should publish user.created event after creating user', async () => {
      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const savedUser = createMockUser({
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
      });

      userRepository.create.mockReturnValue(savedUser);
      userRepository.save.mockResolvedValue(savedUser);

      await service.create(createUserDto);

      expect(kafkaService.emit).toHaveBeenCalledWith(
        'user.created',
        {
          userId: savedUser.id,
          email: savedUser.email,
          name: savedUser.name,
          createdAt: savedUser.createdAt.toISOString(),
        },
        {
          requestId: 'mock-uuid',
          traceId: 'mock-uuid',
          spanId: 'mock-uuid',
        },
      );
    });

    it('should assign default role "user" if not specified', async () => {
      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const savedUser = createMockUser();
      userRepository.create.mockReturnValue(savedUser);
      userRepository.save.mockResolvedValue(savedUser);

      await service.create(createUserDto);

      expect(userRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: hashedPassword,
        role: 'user',
      });
    });

    it('should use provided role if specified', async () => {
      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const createAdminDto = { ...createUserDto, role: 'admin' };
      const savedUser = createMockUser({ role: 'admin' });

      userRepository.create.mockReturnValue(savedUser);
      userRepository.save.mockResolvedValue(savedUser);

      await service.create(createAdminDto);

      expect(userRepository.create).toHaveBeenCalledWith({
        ...createAdminDto,
        password: hashedPassword,
        role: 'admin',
      });
    });

    it('should log user creation with trace context', async () => {
      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const savedUser = createMockUser();
      userRepository.create.mockReturnValue(savedUser);
      userRepository.save.mockResolvedValue(savedUser);

      await service.create(createUserDto);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Creating user with email: ${createUserDto.email}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'UsersService',
      );

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `User created successfully: ${savedUser.id}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'UsersService',
      );
    });

    it('should use provided requestId if given', async () => {
      const hashedPassword = 'hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const savedUser = createMockUser();
      userRepository.create.mockReturnValue(savedUser);
      userRepository.save.mockResolvedValue(savedUser);

      const customRequestId = 'custom-request-id';
      await service.create(createUserDto, customRequestId);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        expect.any(String),
        customRequestId,
        'mock-uuid',
        'mock-uuid',
        'UsersService',
      );
    });
  });

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      const users = [
        createMockUser({ email: 'user1@example.com' }),
        createMockUser({ email: 'user2@example.com' }),
      ];

      userRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(userRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[1]).not.toHaveProperty('password');
      expect(result[0].email).toBe('user1@example.com');
      expect(result[1].email).toBe('user2@example.com');
    });

    it('should return empty array when no users exist', async () => {
      userRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should log the operation with trace context', async () => {
      userRepository.find.mockResolvedValue([]);

      await service.findAll();

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        'Fetching all users',
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'UsersService',
      );
    });
  });

  describe('findOne', () => {
    it('should return user without password when found', async () => {
      const user = createMockUser({ email: 'test@example.com' });
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne(user.id);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
      });
      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@example.com');
    });

    it('should return null when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('non-existent-id');

      expect(result).toBeNull();
    });

    it('should log the operation with trace context', async () => {
      const userId = 'test-user-id';
      userRepository.findOne.mockResolvedValue(null);

      await service.findOne(userId);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Fetching user: ${userId}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'UsersService',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const user = createMockUser({ email: 'test@example.com' });
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(user);
    });

    it('should return null when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should log the operation with trace context', async () => {
      const email = 'test@example.com';
      userRepository.findOne.mockResolvedValue(null);

      await service.findByEmail(email);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Fetching user by email: ${email}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'UsersService',
      );
    });
  });

  describe('hasAnyAdmin', () => {
    it('should return true when admin exists', async () => {
      userRepository.count.mockResolvedValue(1);

      const result = await service.hasAnyAdmin();

      expect(userRepository.count).toHaveBeenCalledWith({
        where: { role: 'admin' },
      });
      expect(result).toBe(true);
    });

    it('should return false when no admin exists', async () => {
      userRepository.count.mockResolvedValue(0);

      const result = await service.hasAnyAdmin();

      expect(result).toBe(false);
    });

    it('should return true when multiple admins exist', async () => {
      userRepository.count.mockResolvedValue(5);

      const result = await service.hasAnyAdmin();

      expect(result).toBe(true);
    });
  });

  describe('update', () => {
    const userId = 'test-user-id';
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    it('should update user and return user without password', async () => {
      const updatedUser = createMockUser({
        id: userId,
        name: updateUserDto.name,
        email: updateUserDto.email,
      });

      userRepository.update.mockResolvedValue(undefined);
      userRepository.findOne.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateUserDto);

      expect(userRepository.update).toHaveBeenCalledWith(userId, updateUserDto);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('password');
      expect(result.name).toBe(updateUserDto.name);
    });

    it('should hash new password when password is updated', async () => {
      const hashedPassword = 'new_hashed_password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const updateWithPassword = { ...updateUserDto, password: 'NewPassword123!' };
      const updatedUser = createMockUser({
        id: userId,
        password: hashedPassword,
      });

      userRepository.update.mockResolvedValue(undefined);
      userRepository.findOne.mockResolvedValue(updatedUser);

      await service.update(userId, updateWithPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(userRepository.update).toHaveBeenCalledWith(userId, {
        ...updateUserDto,
        password: hashedPassword,
      });
    });

    it('should not hash password when password is not in update DTO', async () => {
      const updatedUser = createMockUser({ id: userId });

      userRepository.update.mockResolvedValue(undefined);
      userRepository.findOne.mockResolvedValue(updatedUser);

      await service.update(userId, updateUserDto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(userRepository.update).toHaveBeenCalledWith(userId, updateUserDto);
    });

    it('should return null when user does not exist', async () => {
      userRepository.update.mockResolvedValue(undefined);
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.update(userId, updateUserDto);

      expect(result).toBeNull();
    });

    it('should log the operation with trace context', async () => {
      userRepository.update.mockResolvedValue(undefined);
      userRepository.findOne.mockResolvedValue(null);

      await service.update(userId, updateUserDto);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Updating user: ${userId}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'UsersService',
      );
    });
  });

  describe('remove', () => {
    it('should delete user by id', async () => {
      const userId = 'test-user-id';
      userRepository.delete.mockResolvedValue(undefined);

      await service.remove(userId);

      expect(userRepository.delete).toHaveBeenCalledWith(userId);
    });

    it('should log the operation with trace context', async () => {
      const userId = 'test-user-id';
      userRepository.delete.mockResolvedValue(undefined);

      await service.remove(userId);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        `Deleting user: ${userId}`,
        'mock-uuid',
        'mock-uuid',
        'mock-uuid',
        'UsersService',
      );
    });

    it('should use provided requestId if given', async () => {
      const userId = 'test-user-id';
      const customRequestId = 'custom-request-id';
      userRepository.delete.mockResolvedValue(undefined);

      await service.remove(userId, customRequestId);

      expect(logger.logWithTrace).toHaveBeenCalledWith(
        expect.any(String),
        customRequestId,
        'mock-uuid',
        'mock-uuid',
        'UsersService',
      );
    });
  });
});
