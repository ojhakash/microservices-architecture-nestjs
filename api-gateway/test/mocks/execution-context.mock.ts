import { ExecutionContext } from '@nestjs/common';

export const createMockExecutionContext = (
  request: any = {},
  response: any = {},
): ExecutionContext => {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
      getResponse: jest.fn().mockReturnValue(response),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as any;
};

export const createMockRequest = (overrides: any = {}) => ({
  headers: {},
  query: {},
  user: undefined,
  ...overrides,
});
