import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { UnauthorizedException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { createMockHttpService, createMockAxiosResponse } from '../../test/mocks/http.mock';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let httpService: ReturnType<typeof createMockHttpService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    httpService = createMockHttpService();
    jwtService = {
      sign: jest.fn(),
    } as any;
    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'USER_SERVICE_URL') return 'http://localhost:3001';
        if (key === 'SERVICE_API_KEYS') return 'key1,key2,key3';
        return defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'Password123!';

    it('should return user without password when credentials are valid', async () => {
      const mockUser = {
        id: 'user-123',
        email,
        name: 'Test User',
        password: 'hashed_password',
        role: 'user',
      };

      httpService.get.mockReturnValue(of(createMockAxiosResponse(mockUser)));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3001/users/email/test@example.com',
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashed_password');
      expect(result).toEqual({
        id: 'user-123',
        email,
        name: 'Test User',
        role: 'user',
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const mockUser = {
        id: 'user-123',
        email,
        password: 'hashed_password',
        role: 'user',
      };

      httpService.get.mockReturnValue(of(createMockAxiosResponse(mockUser)));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser(email, password)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException when user does not exist (404)', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 404 },
        })),
      );

      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser(email, password)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException when user service returns 500', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 500 },
        })),
      );

      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser(email, password)).rejects.toThrow(
        'Authentication service error',
      );
    });

    it('should throw UnauthorizedException when user does not have password', async () => {
      const mockUser = {
        id: 'user-123',
        email,
        role: 'user',
      };

      httpService.get.mockReturnValue(of(createMockAxiosResponse(mockUser)));

      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser(email, password)).rejects.toThrow(
        'User account does not have a password set',
      );
    });

    it('should throw UnauthorizedException when HTTP request fails', async () => {
      httpService.get.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user data is null', async () => {
      httpService.get.mockReturnValue(of(createMockAxiosResponse(null)));

      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.validateUser(email, password)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should return access_token and user data', async () => {
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        name: 'Test User',
        password: 'hashed_password',
        role: 'user',
      };

      httpService.get.mockReturnValue(of(createMockAxiosResponse(mockUser)));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: {
          id: 'user-123',
          email: loginDto.email,
          name: 'Test User',
          role: 'user',
        },
      });
    });

    it('should generate JWT with correct payload', async () => {
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        name: 'Test User',
        password: 'hashed_password',
        role: 'admin',
      };

      httpService.get.mockReturnValue(of(createMockAxiosResponse(mockUser)));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: loginDto.email,
        role: 'admin',
      });
    });

    it('should default to "user" role if not provided', async () => {
      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        name: 'Test User',
        password: 'hashed_password',
      };

      httpService.get.mockReturnValue(of(createMockAxiosResponse(mockUser)));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: loginDto.email,
        role: 'user',
      });
      expect(result.user.role).toBe('user');
    });

    it('should throw UnauthorizedException when validateUser fails', async () => {
      httpService.get.mockReturnValue(
        throwError(() => ({
          response: { status: 404 },
        })),
      );

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      const result = await service.validateApiKey('key1');

      expect(result).toBe(true);
    });

    it('should return true for another valid API key', async () => {
      const result = await service.validateApiKey('key2');

      expect(result).toBe(true);
    });

    it('should return false for invalid API key', async () => {
      const result = await service.validateApiKey('invalid-key');

      expect(result).toBe(false);
    });

    it('should return false for undefined API key', async () => {
      const result = await service.validateApiKey(undefined as any);

      expect(result).toBe(false);
    });

    it('should return false when no API keys are configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SERVICE_API_KEYS') return undefined;
        return 'http://localhost:3001';
      });

      const result = await service.validateApiKey('any-key');

      expect(result).toBe(false);
    });

    it('should handle empty string API keys config', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SERVICE_API_KEYS') return '';
        return 'http://localhost:3001';
      });

      const result = await service.validateApiKey('key1');

      expect(result).toBe(false);
    });
  });
});
