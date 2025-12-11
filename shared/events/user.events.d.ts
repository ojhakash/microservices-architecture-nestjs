export interface UserCreatedEvent {
    userId: string;
    email: string;
    name: string;
    createdAt: string;
}
export interface UserCreatedEventHeaders {
    requestId?: string;
    traceId?: string;
    spanId?: string;
}
