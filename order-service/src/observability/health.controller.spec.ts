import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('liveness', () => {
    it('should return healthy status', async () => {
      const healthyResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResult);

      const result = await controller.liveness();

      expect(healthCheckService.check).toHaveBeenCalledWith([]);
      expect(result).toEqual(healthyResult);
      expect(result.status).toBe('ok');
    });

    it('should call health check service with empty array', async () => {
      const healthyResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResult);

      await controller.liveness();

      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(healthCheckService.check).toHaveBeenCalledWith([]);
    });

    it('should handle health check errors', async () => {
      const error = new Error('Health check failed');
      mockHealthCheckService.check.mockRejectedValue(error);

      await expect(controller.liveness()).rejects.toThrow(error);
    });
  });

  describe('readiness', () => {
    it('should return ready status', async () => {
      const readyResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      mockHealthCheckService.check.mockResolvedValue(readyResult);

      const result = await controller.readiness();

      expect(healthCheckService.check).toHaveBeenCalledWith([]);
      expect(result).toEqual(readyResult);
      expect(result.status).toBe('ok');
    });

    it('should call health check service with empty array', async () => {
      const readyResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      mockHealthCheckService.check.mockResolvedValue(readyResult);

      await controller.readiness();

      expect(healthCheckService.check).toHaveBeenCalledTimes(1);
      expect(healthCheckService.check).toHaveBeenCalledWith([]);
    });

    it('should handle readiness check errors', async () => {
      const error = new Error('Readiness check failed');
      mockHealthCheckService.check.mockRejectedValue(error);

      await expect(controller.readiness()).rejects.toThrow(error);
    });
  });

  describe('liveness vs readiness', () => {
    it('should call same health check service for both endpoints', async () => {
      const healthyResult: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResult);

      await controller.liveness();
      await controller.readiness();

      expect(healthCheckService.check).toHaveBeenCalledTimes(2);
    });
  });
});
