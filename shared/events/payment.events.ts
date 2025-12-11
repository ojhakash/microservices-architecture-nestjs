export interface PaymentCompletedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  status: 'completed' | 'failed';
  completedAt: string;
}

export interface PaymentCompletedEventHeaders {
  requestId?: string;
  traceId?: string;
  spanId?: string;
}

