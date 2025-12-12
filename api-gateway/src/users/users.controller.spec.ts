import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { of, throwError } from 'rxjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let httpService: HttpService;
  let configService: ConfigService;
  let jwtService: JwtService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3001'),
  };

  const mockJwtService = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create first admin user without authentication', async () => {
      const createUserDto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin',
      };

      const createdUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
      };

      const mockRequest = { headers: {} } as any;

      mockHttpService.get.mockReturnValue(of({ data: { hasAdmin: false } }));
      mockHttpService.post.mockReturnValue(of({ data: createdUser }));

      const result = await controller.createUser(createUserDto, mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3001/users/admin/check',
        { headers: {} },
      );
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3001/users',
        createUserDto,
        { headers: {} },
      );
      expect(result).toEqual(createdUser);
    });

    it('should reject non-admin first user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'user@example.com',
        password: 'password123',
        name: 'Regular User',
        role: 'user',
      };

      const mockRequest = { headers: {} } as any;

      mockHttpService.get.mockReturnValue(of({ data: { hasAdmin: false } }));

      await expect(
        controller.createUser(createUserDto, mockRequest),
      ).rejects.toThrow(BadRequestException);

      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should require admin token when admin exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'user@example.com',
        password: 'password123',
        name: 'New User',
      };

      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-admin-token',
        },
      } as any;

      mockHttpService.get.mockReturnValue(of({ data: { hasAdmin: true } }));
      mockJwtService.verify.mockReturnValue({ id: '1', role: 'admin' });
      mockHttpService.post.mockReturnValue(
        of({ data: { id: '2', ...createUserDto } }),
      );

      const result = await controller.createUser(createUserDto, mockRequest);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-admin-token');
      expect(httpService.post).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('should reject user creation without admin token when admin exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'user@example.com',
        password: 'password123',
        name: 'New User',
      };

      const mockRequest = { headers: {} } as any;

      mockHttpService.get.mockReturnValue(of({ data: { hasAdmin: true } }));

      await expect(
        controller.createUser(createUserDto, mockRequest),
      ).rejects.toThrow(ForbiddenException);

      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should reject non-admin token when creating user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'user@example.com',
        password: 'password123',
        name: 'New User',
      };

      const mockRequest = {
        headers: {
          authorization: 'Bearer non-admin-token',
        },
      } as any;

      mockHttpService.get.mockReturnValue(of({ data: { hasAdmin: true } }));
      mockJwtService.verify.mockReturnValue({ id: '1', role: 'user' });

      await expect(
        controller.createUser(createUserDto, mockRequest),
      ).rejects.toThrow(ForbiddenException);

      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      const createUserDto: CreateUserDto = {
        email: 'user@example.com',
        password: 'password123',
        name: 'New User',
      };

      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      } as any;

      mockHttpService.get.mockReturnValue(of({ data: { hasAdmin: true } }));
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        controller.createUser(createUserDto, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forward X-Request-Id header', async () => {
      const createUserDto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin',
      };

      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      } as any;

      mockHttpService.get.mockReturnValue(of({ data: { hasAdmin: false } }));
      mockHttpService.post.mockReturnValue(of({ data: { id: '1' } }));

      await controller.createUser(createUserDto, mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3001/users/admin/check',
        { headers: { 'X-Request-Id': 'test-request-id' } },
      );
      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3001/users',
        createUserDto,
        { headers: { 'X-Request-Id': 'test-request-id' } },
      );
    });

    it('should handle admin check failure gracefully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'password123',
        name: 'Admin User',
        role: 'admin',
      };

      const mockRequest = { headers: {} } as any;

      // Admin check fails
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Service unavailable')),
      );
      mockHttpService.post.mockReturnValue(of({ data: { id: '1' } }));

      // Should still allow creating admin user
      await controller.createUser(createUserDto, mockRequest);

      expect(httpService.post).toHaveBeenCalled();
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const users = [
        { id: '1', email: 'user1@example.com', name: 'User 1' },
        { id: '2', email: 'user2@example.com', name: 'User 2' },
      ];

      const mockRequest = { headers: {} } as any;
      const mockUser = { id: '1', role: 'admin' };

      mockHttpService.get.mockReturnValue(of({ data: users }));

      const result = await controller.getAllUsers(mockRequest, mockUser);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3001/users',
        { headers: {} },
      );
      expect(result).toEqual(users);
    });

    it('should forward X-Request-Id header', async () => {
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      } as any;
      const mockUser = { id: '1', role: 'user' };

      mockHttpService.get.mockReturnValue(of({ data: [] }));

      await controller.getAllUsers(mockRequest, mockUser);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3001/users',
        { headers: { 'X-Request-Id': 'test-request-id' } },
      );
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const userId = '123';
      const user = {
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
      };

      const mockRequest = { headers: {} } as any;
      mockHttpService.get.mockReturnValue(of({ data: user }));

      const result = await controller.getUserById(userId, mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        `http://localhost:3001/users/${userId}`,
        { headers: {} },
      );
      expect(result).toEqual(user);
    });

    it('should forward X-Request-Id header', async () => {
      const userId = '123';
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      } as any;

      mockHttpService.get.mockReturnValue(of({ data: { id: userId } }));

      await controller.getUserById(userId, mockRequest);

      expect(httpService.get).toHaveBeenCalledWith(
        `http://localhost:3001/users/${userId}`,
        { headers: { 'X-Request-Id': 'test-request-id' } },
      );
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const userId = '123';
      const updateUserDto: UpdateUserDto = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const updatedUser = {
        id: userId,
        ...updateUserDto,
      };

      const mockRequest = { headers: {} } as any;
      mockHttpService.put.mockReturnValue(of({ data: updatedUser }));

      const result = await controller.updateUser(
        userId,
        updateUserDto,
        mockRequest,
      );

      expect(httpService.put).toHaveBeenCalledWith(
        `http://localhost:3001/users/${userId}`,
        updateUserDto,
        { headers: {} },
      );
      expect(result).toEqual(updatedUser);
    });

    it('should forward X-Request-Id header', async () => {
      const userId = '123';
      const updateUserDto: UpdateUserDto = { name: 'New Name' };
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      } as any;

      mockHttpService.put.mockReturnValue(of({ data: { id: userId } }));

      await controller.updateUser(userId, updateUserDto, mockRequest);

      expect(httpService.put).toHaveBeenCalledWith(
        `http://localhost:3001/users/${userId}`,
        updateUserDto,
        { headers: { 'X-Request-Id': 'test-request-id' } },
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const userId = '123';
      const mockRequest = { headers: {} } as any;

      mockHttpService.delete.mockReturnValue(of({ data: null }));

      await controller.deleteUser(userId, mockRequest);

      expect(httpService.delete).toHaveBeenCalledWith(
        `http://localhost:3001/users/${userId}`,
        { headers: {} },
      );
    });

    it('should forward X-Request-Id header', async () => {
      const userId = '123';
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      } as any;

      mockHttpService.delete.mockReturnValue(of({ data: null }));

      await controller.deleteUser(userId, mockRequest);

      expect(httpService.delete).toHaveBeenCalledWith(
        `http://localhost:3001/users/${userId}`,
        { headers: { 'X-Request-Id': 'test-request-id' } },
      );
    });

    it('should handle delete errors', async () => {
      const userId = '123';
      const mockRequest = { headers: {} } as any;
      const error = new Error('User not found');

      mockHttpService.delete.mockReturnValue(
        throwError(() => error),
      );

      await expect(
        controller.deleteUser(userId, mockRequest),
      ).rejects.toThrow(error);
    });
  });
});
