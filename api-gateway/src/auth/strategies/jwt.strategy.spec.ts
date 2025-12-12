import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload } from '../auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate and return user data from valid JWT payload', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
    });

    it('should default role to user if not provided', async () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
    });

    it('should validate admin role correctly', async () => {
      const payload: JwtPayload = {
        sub: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };

      const result = await strategy.validate(payload);

      expect(result.role).toBe('admin');
    });

    it('should throw UnauthorizedException when sub is missing', async () => {
      const payload = {
        email: 'test@example.com',
        role: 'user',
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Invalid token payload',
      );
    });

    it('should throw UnauthorizedException when email is missing', async () => {
      const payload = {
        sub: 'user-123',
        role: 'user',
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Invalid token payload',
      );
    });

    it('should throw UnauthorizedException when both sub and email are missing', async () => {
      const payload = {
        role: 'user',
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle empty string sub', async () => {
      const payload = {
        sub: '',
        email: 'test@example.com',
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle empty string email', async () => {
      const payload = {
        sub: 'user-123',
        email: '',
      } as any;

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('constructor', () => {
    it('should configure JWT strategy with correct secret from config', () => {
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should use custom JWT secret from config', async () => {
      mockConfigService.get.mockReturnValue('custom-secret-key');

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtStrategy,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const newStrategy = module.get<JwtStrategy>(JwtStrategy);

      expect(newStrategy).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });
  });
});
