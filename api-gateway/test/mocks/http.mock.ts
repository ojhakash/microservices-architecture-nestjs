import { of } from 'rxjs';

export const createMockHttpService = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
  axiosRef: {} as any,
});

export const createMockAxiosResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});
