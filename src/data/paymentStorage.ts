import { orderTotals } from './orderModel';
import { paymentMethods, splitPayment, type PaymentTransaction } from './paymentModel';

export const PAYMENT_STORAGE_KEY = 'tera.payments.v1';
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const amount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
function validTransaction(value: unknown): value is PaymentTransaction {
  if (!record(value) || !amount(value.orderId) || value.id !== `P-${value.orderId}` || !Number.isInteger(value.tableId) || Number(value.tableId) < 1 || Number(value.tableId) > 12 || !Number.isInteger(value.guests) || Number(value.guests) < 1 || !paymentMethods.includes(value.method as never) || !['Paid', 'Refunded'].includes(String(value.status)) || !date(value.paidAt) || (value.status === 'Refunded' && !date(value.refundedAt))) return false;
  if (!Array.isArray(value.items) || !value.items.length || !value.items.every(item => record(item) && typeof item.menuItemId === 'string' && typeof item.name === 'string' && amount(item.price) && Number.isInteger(item.quantity) && Number(item.quantity) > 0)) return false;
  const entry = value as unknown as PaymentTransaction;
  const totals = orderTotals(entry.items);
  if (entry.subtotal !== totals.subtotal || entry.service !== totals.service || entry.total !== totals.total || !Number.isInteger(entry.splitCount) || entry.splitCount < 1 || entry.splitCount > 4 || !Array.isArray(entry.shares) || JSON.stringify(entry.shares) !== JSON.stringify(splitPayment(entry.total, entry.splitCount))) return false;
  return entry.method !== 'Cash' || (amount(entry.cashReceived) && entry.cashReceived >= entry.total && entry.change === entry.cashReceived - entry.total);
}
export function loadPayments(): PaymentTransaction[] | null {
  try {
    const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) && data.every(validTransaction) && new Set(data.map(entry => entry.orderId)).size === data.length ? data : null;
  } catch { return null; }
}
export function persistPayments(transactions: PaymentTransaction[]): boolean {
  try { localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(transactions)); return true; }
  catch { return false; }
}
