import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyStrategy } from './api-key.strategy';
import { AuthService } from '../auth.service';

describe('ApiKeyStrategy', () => {
  let strategy: ApiKeyStrategy;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<ApiKeyStrategy>(ApiKeyStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should inject AuthService', () => {
      expect(authService).toBeDefined();
    });
  });
});
