import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { KafkaModule } from '../kafka/kafka.module';
import { ConfluentKafkaConsumerService } from '../kafka/confluent-kafka-consumer.service';

@Module({
  imports: [KafkaModule],
  controllers: [],
  providers: [PaymentsService, ConfluentKafkaConsumerService],
})
export class PaymentsModule {}

