import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createUserDto: CreateUserDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.usersService.create(createUserDto, requestId);
  }

  @Get('admin/check')
  async checkAdminExists(@Headers('x-request-id') requestId?: string) {
    const hasAdmin = await this.usersService.hasAnyAdmin();
    return { hasAdmin };
  }

  @Get()
  async findAll(@Headers('x-request-id') requestId?: string) {
    return this.usersService.findAll(requestId);
  }

  @Get('email/:email')
  async findByEmail(
    @Param('email') email: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const user = await this.usersService.findByEmail(email, requestId);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const user = await this.usersService.findOne(id, requestId);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const user = await this.usersService.update(id, updateUserDto, requestId);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    await this.usersService.remove(id, requestId);
  }
}

