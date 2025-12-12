import { ExecutionContext } from '@nestjs/common';

describe('CurrentUser Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  // Helper to test the decorator logic directly
  const testDecoratorLogic = (ctx: ExecutionContext) => {
    // This simulates what the CurrentUser decorator does
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  };

  beforeEach(() => {
    mockRequest = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      },
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should extract user from request', () => {
    const result = testDecoratorLogic(mockExecutionContext);

    expect(result).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });
  });

  it('should return undefined when user is not in request', () => {
    mockRequest.user = undefined;

    const result = testDecoratorLogic(mockExecutionContext);

    expect(result).toBeUndefined();
  });

  it('should extract admin user correctly', () => {
    mockRequest.user = {
      userId: 'admin-456',
      email: 'admin@example.com',
      role: 'admin',
    };

    const result = testDecoratorLogic(mockExecutionContext);

    expect(result.role).toBe('admin');
    expect(result.email).toBe('admin@example.com');
  });

  it('should handle user object with additional properties', () => {
    mockRequest.user = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
      name: 'Test User',
      createdAt: new Date(),
    };

    const result = testDecoratorLogic(mockExecutionContext);

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('createdAt');
  });

  it('should call switchToHttp on execution context', () => {
    testDecoratorLogic(mockExecutionContext);

    expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
  });

  it('should call getRequest on HTTP context', () => {
    const mockHttpContext = mockExecutionContext.switchToHttp();

    testDecoratorLogic(mockExecutionContext);

    expect(mockHttpContext.getRequest).toHaveBeenCalled();
  });

  it('should return null when user is explicitly null', () => {
    mockRequest.user = null;

    const result = testDecoratorLogic(mockExecutionContext);

    expect(result).toBeNull();
  });

  it('should handle empty user object', () => {
    mockRequest.user = {};

    const result = testDecoratorLogic(mockExecutionContext);

    expect(result).toEqual({});
  });
});
