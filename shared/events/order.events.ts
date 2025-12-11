export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  createdAt: string;
}

export interface OrderCreatedEventHeaders {
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

