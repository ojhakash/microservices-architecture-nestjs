import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockAuthService = {
    login: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3001'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return JWT token', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'user',
      };

      const createdUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      };

      const loginResponse = {
        access_token: 'jwt-token',
        user: createdUser,
      };

      mockHttpService.post.mockReturnValue(
        of({ data: createdUser }),
      );
      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await controller.register(registerDto);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3001/users',
        registerDto,
      );
      expect(authService.login).toHaveBeenCalledWith({
        email: registerDto.email,
        password: registerDto.password,
      });
      expect(result).toEqual(loginResponse);
    });

    it('should call user service with correct URL from config', async () => {
      mockConfigService.get.mockReturnValue('http://custom-url:3001');

      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const createdUser = { id: '1', email: 'test@example.com' };
      mockHttpService.post.mockReturnValue(of({ data: createdUser }));
      mockAuthService.login.mockResolvedValue({ access_token: 'token' });

      // Create new controller instance to pick up new config
      const module: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const newController = module.get<AuthController>(AuthController);
      await newController.register(registerDto);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://custom-url:3001/users',
        registerDto,
      );
    });

    it('should handle registration errors from user service', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const error = new Error('User already exists');
      mockHttpService.post.mockReturnValue(
        throwError(() => error),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(error);
      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user and return JWT token', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const loginResponse = {
        access_token: 'jwt-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
      };

      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(loginResponse);
    });

    it('should handle invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(error);
    });

    it('should handle login with different user roles', async () => {
      const loginDto: LoginDto = {
        email: 'admin@example.com',
        password: 'password123',
      };

      const loginResponse = {
        access_token: 'jwt-token',
        user: {
          id: '1',
          email: 'admin@example.com',
          role: 'admin',
        },
      };

      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await controller.login(loginDto);

      expect(result.user.role).toBe('admin');
    });
  });
});
