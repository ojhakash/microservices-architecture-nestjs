import { Module } from '@nestjs/common';
import { ConfluentKafkaService } from './confluent-kafka.service';

@Module({
  providers: [ConfluentKafkaService],
  exports: [ConfluentKafkaService],
})
export class KafkaModule {}

