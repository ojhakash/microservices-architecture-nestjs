import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    hasAnyAdmin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'user',
      };

      const createdUser = {
        id: 'user-123',
        email: createUserDto.email,
        name: createUserDto.name,
        role: createUserDto.role,
        createdAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto, undefined);
      expect(result).toEqual(createdUser);
    });

    it('should create a user with request ID', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const requestId = 'test-request-id';
      const createdUser = { id: 'user-123', ...createUserDto };

      mockUsersService.create.mockResolvedValue(createdUser);

      await controller.create(createUserDto, requestId);

      expect(service.create).toHaveBeenCalledWith(createUserDto, requestId);
    });

    it('should handle service errors during user creation', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const error = new Error('Email already exists');
      mockUsersService.create.mockRejectedValue(error);

      await expect(controller.create(createUserDto)).rejects.toThrow(error);
    });
  });

  describe('checkAdminExists', () => {
    it('should return true when admin exists', async () => {
      mockUsersService.hasAnyAdmin.mockResolvedValue(true);

      const result = await controller.checkAdminExists();

      expect(service.hasAnyAdmin).toHaveBeenCalled();
      expect(result).toEqual({ hasAdmin: true });
    });

    it('should return false when no admin exists', async () => {
      mockUsersService.hasAnyAdmin.mockResolvedValue(false);

      const result = await controller.checkAdminExists();

      expect(result).toEqual({ hasAdmin: false });
    });

    it('should accept request ID', async () => {
      const requestId = 'test-request-id';
      mockUsersService.hasAnyAdmin.mockResolvedValue(true);

      await controller.checkAdminExists(requestId);

      expect(service.hasAnyAdmin).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [
        { id: 'user-1', email: 'user1@example.com', name: 'User 1' },
        { id: 'user-2', email: 'user2@example.com', name: 'User 2' },
      ];

      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(users);
    });

    it('should return all users with request ID', async () => {
      const requestId = 'test-request-id';
      const users = [{ id: 'user-1' }];

      mockUsersService.findAll.mockResolvedValue(users);

      await controller.findAll(requestId);

      expect(service.findAll).toHaveBeenCalledWith(requestId);
    });

    it('should return empty array when no users exist', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const email = 'test@example.com';
      const user = {
        id: 'user-123',
        email,
        name: 'Test User',
      };

      mockUsersService.findByEmail.mockResolvedValue(user);

      const result = await controller.findByEmail(email);

      expect(service.findByEmail).toHaveBeenCalledWith(email, undefined);
      expect(result).toEqual(user);
    });

    it('should return user by email with request ID', async () => {
      const email = 'test@example.com';
      const requestId = 'test-request-id';
      const user = { id: 'user-123', email };

      mockUsersService.findByEmail.mockResolvedValue(user);

      await controller.findByEmail(email, requestId);

      expect(service.findByEmail).toHaveBeenCalledWith(email, requestId);
    });

    it('should throw NotFoundException when user not found', async () => {
      const email = 'notfound@example.com';

      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(controller.findByEmail(email)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findByEmail(email)).rejects.toThrow(
        `User with email ${email} not found`,
      );
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const userId = 'user-123';
      const user = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      mockUsersService.findOne.mockResolvedValue(user);

      const result = await controller.findOne(userId);

      expect(service.findOne).toHaveBeenCalledWith(userId, undefined);
      expect(result).toEqual(user);
    });

    it('should return user by id with request ID', async () => {
      const userId = 'user-123';
      const requestId = 'test-request-id';
      const user = { id: userId };

      mockUsersService.findOne.mockResolvedValue(user);

      await controller.findOne(userId, requestId);

      expect(service.findOne).toHaveBeenCalledWith(userId, requestId);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 'non-existent-user';

      mockUsersService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findOne(userId)).rejects.toThrow(
        `User with ID ${userId} not found`,
      );
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const userId = 'user-123';
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const updatedUser = {
        id: userId,
        ...updateUserDto,
      };

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, updateUserDto);

      expect(service.update).toHaveBeenCalledWith(
        userId,
        updateUserDto,
        undefined,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should update user with request ID', async () => {
      const userId = 'user-123';
      const updateUserDto: UpdateUserDto = { name: 'New Name' };
      const requestId = 'test-request-id';

      mockUsersService.update.mockResolvedValue({ id: userId });

      await controller.update(userId, updateUserDto, requestId);

      expect(service.update).toHaveBeenCalledWith(
        userId,
        updateUserDto,
        requestId,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const userId = 'non-existent-user';
      const updateUserDto: UpdateUserDto = { name: 'New Name' };

      mockUsersService.update.mockResolvedValue(null);

      await expect(
        controller.update(userId, updateUserDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.update(userId, updateUserDto),
      ).rejects.toThrow(`User with ID ${userId} not found`);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      const userId = 'user-123';

      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(userId);

      expect(service.remove).toHaveBeenCalledWith(userId, undefined);
    });

    it('should delete user with request ID', async () => {
      const userId = 'user-123';
      const requestId = 'test-request-id';

      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(userId, requestId);

      expect(service.remove).toHaveBeenCalledWith(userId, requestId);
    });

    it('should handle service errors during deletion', async () => {
      const userId = 'user-123';
      const error = new Error('Database error');

      mockUsersService.remove.mockRejectedValue(error);

      await expect(controller.remove(userId)).rejects.toThrow(error);
    });
  });
});
