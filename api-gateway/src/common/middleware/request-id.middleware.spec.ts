import { RequestIdMiddleware } from './request-id.middleware';
import { Request, Response, NextFunction } from 'express';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should generate request ID when not provided', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.headers['x-request-id']).toBeDefined();
      expect(typeof mockRequest.headers['x-request-id']).toBe('string');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-Id',
        mockRequest.headers['x-request-id'],
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing request ID when provided', () => {
      const existingRequestId = 'existing-request-id-123';
      mockRequest.headers = {
        'x-request-id': existingRequestId,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.headers['x-request-id']).toBe(existingRequestId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-Id',
        existingRequestId,
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set response header with request ID', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-Id',
        expect.any(String),
      );
    });

    it('should call next function', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should generate unique request IDs for different requests', () => {
      const mockRequest1 = { headers: {} };
      const mockRequest2 = { headers: {} };

      middleware.use(
        mockRequest1 as Request,
        mockResponse as Response,
        mockNext,
      );
      middleware.use(
        mockRequest2 as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest1.headers['x-request-id']).not.toBe(
        mockRequest2.headers['x-request-id'],
      );
    });

    it('should handle uppercase X-Request-ID header', () => {
      const existingRequestId = 'uppercase-request-id';
      mockRequest.headers = {
        'X-Request-ID': existingRequestId,
      } as any;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Express normalizes headers to lowercase
      expect(mockResponse.setHeader).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate UUID v4 format when creating new request ID', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      const requestId = mockRequest.headers['x-request-id'] as string;
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidV4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(requestId).toMatch(uuidV4Regex);
    });
  });
});
