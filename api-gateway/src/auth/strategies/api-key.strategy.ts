import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy {
  constructor(private readonly authService: AuthService) {}
}

