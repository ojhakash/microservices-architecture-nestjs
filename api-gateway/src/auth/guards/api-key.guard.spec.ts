import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { ApiKeyGuard } from './api-key.guard';
import { AuthService } from '../auth.service';
import { createMockExecutionContext, createMockRequest } from '../../../test/mocks/execution-context.mock';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    authService = {
      validateApiKey: jest.fn(),
    } as any;

    guard = new ApiKeyGuard(authService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access with valid API key in x-api-key header', async () => {
      const request = createMockRequest({
        headers: { 'x-api-key': 'valid-key' },
      });
      const context = createMockExecutionContext(request);
      authService.validateApiKey.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(authService.validateApiKey).toHaveBeenCalledWith('valid-key');
      expect(result).toBe(true);
      expect(request.service).toEqual({ authenticated: true });
    });

    it('should allow access with valid API key in api-key header', async () => {
      const request = createMockRequest({
        headers: { 'api-key': 'valid-key' },
      });
      const context = createMockExecutionContext(request);
      authService.validateApiKey.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(authService.validateApiKey).toHaveBeenCalledWith('valid-key');
      expect(result).toBe(true);
    });

    it('should allow access with valid API key in query parameter', async () => {
      const request = createMockRequest({
        headers: {},
        query: { apiKey: 'valid-key' },
      });
      const context = createMockExecutionContext(request);
      authService.validateApiKey.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(authService.validateApiKey).toHaveBeenCalledWith('valid-key');
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when API key is missing', async () => {
      const request = createMockRequest({
        headers: {},
        query: {},
      });
      const context = createMockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('API key is required');
    });

    it('should throw UnauthorizedException when API key is invalid', async () => {
      const request = createMockRequest({
        headers: { 'x-api-key': 'invalid-key' },
      });
      const context = createMockExecutionContext(request);
      authService.validateApiKey.mockResolvedValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid API key');
    });

    it('should throw UnauthorizedException when API key is not a string', async () => {
      const request = createMockRequest({
        headers: { 'x-api-key': ['array', 'value'] },
      });
      const context = createMockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('API key is required');
    });

    it('should prioritize x-api-key header over api-key header', async () => {
      const request = createMockRequest({
        headers: {
          'x-api-key': 'priority-key',
          'api-key': 'secondary-key',
        },
      });
      const context = createMockExecutionContext(request);
      authService.validateApiKey.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(authService.validateApiKey).toHaveBeenCalledWith('priority-key');
    });

    it('should prioritize headers over query parameters', async () => {
      const request = createMockRequest({
        headers: { 'x-api-key': 'header-key' },
        query: { apiKey: 'query-key' },
      });
      const context = createMockExecutionContext(request);
      authService.validateApiKey.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(authService.validateApiKey).toHaveBeenCalledWith('header-key');
    });

    it('should set authenticated flag on request service object', async () => {
      const request = createMockRequest({
        headers: { 'x-api-key': 'valid-key' },
      });
      const context = createMockExecutionContext(request);
      authService.validateApiKey.mockResolvedValue(true);

      await guard.canActivate(context);

      expect(request.service).toBeDefined();
      expect(request.service.authenticated).toBe(true);
    });

    it('should handle empty string API key', async () => {
      const request = createMockRequest({
        headers: { 'x-api-key': '' },
      });
      const context = createMockExecutionContext(request);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('API key is required');
    });
  });
});
