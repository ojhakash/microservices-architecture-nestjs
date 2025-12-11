import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtService } from '@nestjs/jwt';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth('JWT-auth')
export class UsersController {
  private readonly userServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl = this.configService.get<string>('USER_SERVICE_URL', 'http://localhost:3001');
  }

  @Post()
  @Public() // Public endpoint - we'll check admin status inside
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (Admin only, or first admin if none exists)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - First user must be an admin' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Request,
  ) {
    const requestId = req.headers['x-request-id'] as string | undefined;
    const headers = requestId ? { 'X-Request-Id': requestId } : {};

    let hasAdmin = false;
    try {
      // Check if any admin exists
      const adminCheckResponse = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/users/admin/check`, { headers }),
      );
      hasAdmin = adminCheckResponse.data.hasAdmin;
    } catch (error: any) {
      // If admin check fails (e.g., service unavailable), assume no admin exists
      // This ensures bootstrap works even if there's a temporary issue
      console.warn('Admin check failed, assuming no admin exists:', error.message);
      hasAdmin = false;
    }

    // If no admin exists (bootstrap scenario), only allow creating admin users
    if (!hasAdmin) {
      const requestedRole = createUserDto.role || 'user';
      if (requestedRole !== 'admin') {
        throw new BadRequestException(
          'The first user must be an admin. Please create an admin user first.',
        );
      }
      // Allow creating first admin - no auth required
    } else {
      // If admin exists, require admin role (check JWT token)
      const authHeader = req.headers.authorization;
      console.log('authHeader', authHeader);
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ForbiddenException('Authentication required - Admin role needed to create users');
      }
      
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      try {
        const payload = this.jwtService.verify(token);
        if (payload.role !== 'admin') {
          throw new ForbiddenException('Admin role required to create users');
        }
        // Token is valid and user is admin - proceed
      } catch (error: any) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        throw new ForbiddenException('Invalid or expired token');
      }
    }

    const response = await firstValueFrom(
      this.httpService.post(`${this.userServiceUrl}/users`, createUserDto, {
        headers,
      }),
    );
    return response.data;
  }

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async getAllUsers(@Req() req: Request, @CurrentUser() user: any) {
    const requestId = req.headers['x-request-id'] as string | undefined;
    const headers = requestId ? { 'X-Request-Id': requestId } : {};
    const response = await firstValueFrom(
      this.httpService.get(`${this.userServiceUrl}/users`, { headers }),
    );
    return response.data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async getUserById(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const requestId = req.headers['x-request-id'] as string | undefined;
    const headers = requestId ? { 'X-Request-Id': requestId } : {};
    const response = await firstValueFrom(
      this.httpService.get(`${this.userServiceUrl}/users/${id}`, { headers }),
    );
    return response.data;
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const requestId = req.headers['x-request-id'] as string | undefined;
    const headers = requestId ? { 'X-Request-Id': requestId } : {};
    const response = await firstValueFrom(
      this.httpService.put(
        `${this.userServiceUrl}/users/${id}`,
        updateUserDto,
        { headers },
      ),
    );
    return response.data;
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async deleteUser(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const requestId = req.headers['x-request-id'] as string | undefined;
    const headers = requestId ? { 'X-Request-Id': requestId } : {};
    await firstValueFrom(
      this.httpService.delete(`${this.userServiceUrl}/users/${id}`, {
        headers,
      }),
    );
  }
}

