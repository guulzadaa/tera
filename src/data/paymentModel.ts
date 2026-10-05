import type { OrderLine } from './orderModel';

export const paymentMethods = ['Cash', 'Card', 'QR'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export type PaymentStatus = 'Paid' | 'Refunded';
export type PaymentTransaction = {
  id: string; orderId: number; tableId: number; guests: number; items: OrderLine[];
  subtotal: number; service: number; total: number; method: PaymentMethod;
  status: PaymentStatus; paidAt: string; refundedAt?: string;
  cashReceived?: number; change?: number; splitCount: number; shares: number[];
};
export function splitPayment(total: number, count: number) {
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}
export const paymentDay = (date: string) => new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Yekaterinburg' });
export function paymentTimestamp(value: string) {
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Yekaterinburg' });
}
