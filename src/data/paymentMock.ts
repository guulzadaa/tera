import { posMenu } from './mock';
import { orderTotals } from './orderModel';
import { splitPayment, type PaymentMethod, type PaymentTransaction } from './paymentModel';

function historicalReceipt(orderId: number, tableId: number, method: PaymentMethod, minutes: number, menuIds: string[], refunded = false): PaymentTransaction {
  const items = menuIds.map(id => {
    const item = posMenu.find(entry => entry.id === id)!;
    return { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 };
  });
  const totals = orderTotals(items);
  const paidAt = new Date(Date.now() - minutes * 60000).toISOString();
  return { id: `P-${orderId}`, orderId, tableId, guests: 2, items, ...totals, method,
    status: refunded ? 'Refunded' : 'Paid', paidAt,
    ...(refunded ? { refundedAt: new Date(Date.now() - 30 * 60000).toISOString() } : {}),
    ...(method === 'Cash' ? { cashReceived: Math.ceil(totals.total / 1000) * 1000, change: Math.ceil(totals.total / 1000) * 1000 - totals.total } : {}),
    splitCount: 1, shares: splitPayment(totals.total, 1) };
}
// Historical receipt snapshots, not a second pending order queue.
export const initialPayments = [
  historicalReceipt(1038, 2, 'Card', 90, ['salmon', 'caesar', 'water']),
  historicalReceipt(1037, 8, 'Cash', 125, ['burger', 'caesar']),
  historicalReceipt(1036, 10, 'QR', 160, ['steak', 'water']),
  historicalReceipt(1035, 5, 'Card', 200, ['soup', 'bruschetta'], true),
];
