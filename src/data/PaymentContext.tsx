import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useOrders } from './OrderContext';
import { orderTotals, type RestaurantOrder } from './orderModel';
import { initialPayments } from './paymentMock';
import { loadPayments, persistPayments } from './paymentStorage';
import { paymentMethods, splitPayment, type PaymentMethod, type PaymentTransaction } from './paymentModel';

type PaymentStore = {
  transactions: PaymentTransaction[]; pendingBills: RestaurantOrder[]; storageAvailable: boolean;
  completePayment: (orderId: number, method: PaymentMethod, received: number | undefined, splitCount: number) => PaymentTransaction | null;
  refund: (id: string) => void;
};
const PaymentContext = createContext<PaymentStore | null>(null);
export function PaymentProvider({ children }: { children: ReactNode }) {
  const { orders, finishOrder, clearDraft } = useOrders();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(() => loadPayments() ?? initialPayments);
  const settled = useRef(new Set(transactions.map(transaction => transaction.orderId)));
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => { setStorageAvailable(persistPayments(transactions)); }, [transactions]);
  const pendingBills = orders.filter(order => (order.status === 'Ready' || order.status === 'Served') && !transactions.some(transaction => transaction.orderId === order.id));
  function completePayment(orderId: number, method: PaymentMethod, received: number | undefined, splitCount: number) {
    const order = pendingBills.find(bill => bill.id === orderId);
    if (!order || settled.current.has(orderId) || !paymentMethods.includes(method) || !Number.isInteger(splitCount) || splitCount < 1 || splitCount > 4) return null;
    const totals = orderTotals(order.items);
    if (!order.items.length || totals.total <= 0 || (method === 'Cash' && (received === undefined || !Number.isSafeInteger(received) || received < totals.total))) return null;
    const transaction: PaymentTransaction = {
      id: `P-${order.id}`, orderId: order.id, tableId: order.tableId, guests: order.guests,
      items: structuredClone(order.items), ...totals, method, status: 'Paid', paidAt: new Date().toISOString(),
      splitCount, shares: splitPayment(totals.total, splitCount),
      ...(method === 'Cash' ? { cashReceived: received, change: received! - totals.total } : {}),
    };
    settled.current.add(orderId);
    finishOrder(orderId);
    clearDraft(order.tableId);
    setTransactions(current => [transaction, ...current]);
    return transaction;
  }
  function refund(id: string) {
    setTransactions(current => current.map(transaction => transaction.id === id && transaction.status === 'Paid' ? { ...transaction, status: 'Refunded', refundedAt: new Date().toISOString() } : transaction));
  }
  return <PaymentContext.Provider value={{ transactions, pendingBills, storageAvailable, completePayment, refund }}>{children}</PaymentContext.Provider>;
}
export function usePayments() {
  const store = useContext(PaymentContext);
  if (!store) throw new Error('usePayments must be used within PaymentProvider');
  return store;
}
