import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly userServiceUrl: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl = this.configService.get<string>('USER_SERVICE_URL', 'http://localhost:3001');
  }

  async validateUser(email: string, password: string): Promise<any> {
    try {
      // Fetch user from user-service
      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/users/email/${email}`),
      );
      const user = response.data;

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user has a password
      if (!user.password) {
        throw new UnauthorizedException('User account does not have a password set');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Return user without password
      const { password: _, ...result } = user;
      return result;
    } catch (error: any) {
      // If it's already an UnauthorizedException, re-throw it
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Handle HTTP errors from user-service
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          throw new UnauthorizedException('Invalid credentials');
        }
        // For 500 errors, log and throw generic error
        throw new UnauthorizedException('Authentication service error');
      }
      
      // For other errors, throw generic unauthorized
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role || 'user',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
      },
    };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    // In production, validate against a database or secret manager
    const serviceApiKeys = this.configService.get<string>('SERVICE_API_KEYS');
    const validApiKeys = serviceApiKeys?.split(',') || [];
    return validApiKeys.includes(apiKey);
  }
}

