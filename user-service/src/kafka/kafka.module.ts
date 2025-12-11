import { Module, Global } from '@nestjs/common';
import { ConfluentKafkaService } from './confluent-kafka.service';

@Global()
@Module({
  providers: [ConfluentKafkaService],
  exports: [ConfluentKafkaService],
})
export class KafkaModule {}

