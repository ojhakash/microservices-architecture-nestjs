import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.ordersService.create(createOrderDto, requestId);
  }

  @Get()
  async findAll(@Headers('x-request-id') requestId?: string) {
    return this.ordersService.findAll(requestId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const order = await this.ordersService.findOne(id, requestId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }
}

