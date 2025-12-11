import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfluentKafkaService } from '../kafka/confluent-kafka.service';
import { LoggerService } from '../observability/logger.service';
import { UserCreatedEvent } from '../../../shared/events/user.events';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private kafkaService: ConfluentKafkaService,
    private logger: LoggerService,
  ) {}

  async create(createUserDto: CreateUserDto, requestId?: string) {
    const traceId = uuidv4();
    const spanId = uuidv4();
    const reqId = requestId || uuidv4();

    this.logger.logWithTrace(
      `Creating user with email: ${createUserDto.email}`,
      reqId,
      traceId,
      spanId,
      'UsersService',
    );

    // Hash password (required field)
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || 'user',
    });
    const savedUser = await this.usersRepository.save(user);

    // Publish user.created event
    const event: UserCreatedEvent = {
      userId: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
      createdAt: savedUser.createdAt.toISOString(),
    };

    await this.kafkaService.emit('user.created', event, {
      requestId: reqId,
      traceId,
      spanId,
    });

    this.logger.logWithTrace(
      `User created successfully: ${savedUser.id}`,
      reqId,
      traceId,
      spanId,
      'UsersService',
    );

    return savedUser;
  }

  async findAll(requestId?: string) {
    const traceId = uuidv4();
    const spanId = uuidv4();
    const reqId = requestId || uuidv4();

    this.logger.logWithTrace(
      'Fetching all users',
      reqId,
      traceId,
      spanId,
      'UsersService',
    );

    const users = await this.usersRepository.find();
    // Exclude passwords from response
    return users.map(({ password, ...user }) => user);
  }

  async findOne(id: string, requestId?: string) {
    const traceId = uuidv4();
    const spanId = uuidv4();
    const reqId = requestId || uuidv4();

    this.logger.logWithTrace(
      `Fetching user: ${id}`,
      reqId,
      traceId,
      spanId,
      'UsersService',
    );

    const user = await this.usersRepository.findOne({ where: { id } });
    if (user) {
      // Exclude password from response
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  async findByEmail(email: string, requestId?: string) {
    const traceId = uuidv4();
    const spanId = uuidv4();
    const reqId = requestId || uuidv4();

    this.logger.logWithTrace(
      `Fetching user by email: ${email}`,
      reqId,
      traceId,
      spanId,
      'UsersService',
    );

    return this.usersRepository.findOne({ where: { email } });
  }

  async hasAnyAdmin(): Promise<boolean> {
    const adminCount = await this.usersRepository.count({
      where: { role: 'admin' },
    });
    return adminCount > 0;
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestId?: string) {
    const traceId = uuidv4();
    const spanId = uuidv4();
    const reqId = requestId || uuidv4();

    this.logger.logWithTrace(
      `Updating user: ${id}`,
      reqId,
      traceId,
      spanId,
      'UsersService',
    );

    // Hash password if provided in update
    const updateData: any = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.usersRepository.update(id, updateData);
    const user = await this.usersRepository.findOne({ where: { id } });
    if (user) {
      // Exclude password from response
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  async remove(id: string, requestId?: string) {
    const traceId = uuidv4();
    const spanId = uuidv4();
    const reqId = requestId || uuidv4();

    this.logger.logWithTrace(
      `Deleting user: ${id}`,
      reqId,
      traceId,
      spanId,
      'UsersService',
    );

    await this.usersRepository.delete(id);
  }
}
