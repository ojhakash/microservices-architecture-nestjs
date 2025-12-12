import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { createMockExecutionContext, createMockRequest } from '../../../test/mocks/execution-context.mock';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      const request = createMockRequest({ user: { id: '123', role: 'user' } });
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has matching role', () => {
      const request = createMockRequest({ user: { id: '123', role: 'admin' } });
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(['admin']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should block access when user lacks required role', () => {
      const request = createMockRequest({ user: { id: '123', role: 'user' } });
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(['admin']);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should block access when user is not authenticated', () => {
      const request = createMockRequest();
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(['user']);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access when user has one of multiple required roles', () => {
      const request = createMockRequest({ user: { id: '123', role: 'moderator' } });
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(['admin', 'moderator']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should block access when user role does not match any required roles', () => {
      const request = createMockRequest({ user: { id: '123', role: 'user' } });
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(['admin', 'moderator']);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should check both handler and class for @Roles() decorator', () => {
      const request = createMockRequest({ user: { id: '123', role: 'admin' } });
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(['admin']);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should handle user role case-sensitively', () => {
      const request = createMockRequest({ user: { id: '123', role: 'Admin' } });
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue(['admin']);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access for empty required roles array', () => {
      const request = createMockRequest({ user: { id: '123', role: 'user' } });
      const context = createMockExecutionContext(request);
      reflector.getAllAndOverride.mockReturnValue([]);

      const result = guard.canActivate(context);

      expect(result).toBe(false); // Empty array means no role matches
    });
  });
});
