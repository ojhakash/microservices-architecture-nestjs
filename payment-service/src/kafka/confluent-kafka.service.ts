import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Producer } from '@confluentinc/kafka-javascript';

@Injectable()
export class ConfluentKafkaService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer | null = null;
  private readonly brokers: string;
  private readonly clientId: string;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    this.brokers = this.configService.get<string>('KAFKA_BROKERS', 'localhost:9094');
    this.clientId = this.configService.get<string>('SERVICE_NAME', 'payment-service');
  }

  async onModuleInit() {
    await this.connect();
  }

  async connect() {
    if (this.isConnected && this.producer) {
      return;
    }

    try {
      this.producer = new Producer({
        'bootstrap.servers': this.brokers,
        'client.id': this.clientId,
        'socket.timeout.ms': 10000,
        'metadata.broker.list': this.brokers,
      });

      // Wait for the producer to be ready using callback
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        this.producer!.connect({ timeout: 10000 }, (err) => {
          clearTimeout(timeout);
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      this.isConnected = true;
      console.log('✅ Confluent Kafka producer connected successfully');
    } catch (error) {
      console.warn('⚠️  Confluent Kafka producer connection failed:', error.message);
      this.isConnected = false;
      // Retry after delay
      setTimeout(() => this.connect(), 5000);
    }
  }

  async onModuleDestroy() {
    if (this.producer && this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
    }
  }

  async emit(topic: string, data: any, headers?: Record<string, string>) {
    if (!this.producer || !this.isConnected) {
      await this.connect();
      if (!this.producer || !this.isConnected) {
        throw new Error('Kafka producer not available');
      }
    }

    const kafkaHeaders = headers
      ? Object.entries(headers).map(([key, value]) => ({
          key,
          value: Buffer.from(String(value)),
        }))
      : [];

    // Confluent Producer API: produce(topic, partition, message, key, timestamp, opaque, headers)
    this.producer.produce(
      topic,
      null, // partition (null = auto-assign)
      Buffer.from(JSON.stringify(data)), // message value
      null, // key
      null, // timestamp (null = auto)
      null, // opaque
      kafkaHeaders.length > 0 ? kafkaHeaders : undefined, // headers
    );

    // Poll to ensure delivery
    this.producer.poll();
  }
}

