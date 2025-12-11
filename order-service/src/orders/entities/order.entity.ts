import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column('jsonb')
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;

  @Column('decimal')
  totalAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}

