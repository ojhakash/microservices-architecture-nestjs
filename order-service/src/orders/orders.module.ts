import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { KafkaModule } from '../kafka/kafka.module';
import { ConfluentKafkaConsumerService } from '../kafka/confluent-kafka-consumer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), KafkaModule],
  controllers: [OrdersController],
  providers: [OrdersService, ConfluentKafkaConsumerService],
})
export class OrdersModule {}

