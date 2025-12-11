import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  private readonly orderServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.orderServiceUrl = this.configService.get<string>('ORDER_SERVICE_URL', 'http://localhost:3002');
  }

  @Post()
  @Roles('user', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: Request,
  ) {
    const requestId = req.headers['x-request-id'] as string | undefined;
    const headers = requestId ? { 'X-Request-Id': requestId } : {};
    const response = await firstValueFrom(
      this.httpService.post(`${this.orderServiceUrl}/orders`, createOrderDto, {
        headers,
      }),
    );
    return response.data;
  }

  @Get()
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async getAllOrders(@Req() req: Request, @CurrentUser() user: any) {
    const requestId = req.headers['x-request-id'] as string | undefined;
    const headers = requestId ? { 'X-Request-Id': requestId } : {};
    const response = await firstValueFrom(
      this.httpService.get(`${this.orderServiceUrl}/orders`, { headers }),
    );
    return response.data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiHeader({ name: 'X-Request-Id', required: false })
  async getOrderById(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const requestId = req.headers['x-request-id'] as string | undefined;
    const headers = requestId ? { 'X-Request-Id': requestId } : {};
    const response = await firstValueFrom(
      this.httpService.get(`${this.orderServiceUrl}/orders/${id}`, {
        headers,
      }),
    );
    return response.data;
  }
}

