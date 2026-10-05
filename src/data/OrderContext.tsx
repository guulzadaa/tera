import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { posOrders } from './mock';
import type { OrderDraft, OrderStatus, RestaurantOrder } from './orderModel';
import { loadOrders, persistOrders } from './orderStorage';

type OrderStore = {
  orders: RestaurantOrder[];
  drafts: Record<number, OrderDraft>;
  saveDraft: (draft: OrderDraft) => void;
  sendToKitchen: (draft: OrderDraft) => number;
  advanceOrder: (id: number) => void;
  storageAvailable: boolean;
  finishOrder: (id: number) => void;
  clearDraft: (tableId: number) => void;
};
const OrderContext = createContext<OrderStore | null>(null);

// POS and KDS consume the same orders. Persistence is optional when storage is blocked.
// Drafts are separate from the kitchen queue and never appear as active orders.
export function OrderProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(loadOrders);
  const [orders, setOrders] = useState<RestaurantOrder[]>(saved?.orders ?? posOrders);
  const [drafts, setDrafts] = useState<Record<number, OrderDraft>>(saved?.drafts ?? {});
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => { setStorageAvailable(persistOrders({ orders, drafts })); }, [orders, drafts]);

  function saveDraft(draft: OrderDraft) {
    setDrafts(current => ({ ...current, [draft.tableId]: structuredClone(draft) }));
  }
  function sendToKitchen(draft: OrderDraft) {
    const id = draft.orderId ?? Math.max(1047, ...orders.map(order => order.id)) + 1;
    const now = new Date().toISOString();
    const existing = orders.find(order => order.id === id);
    const submitted: RestaurantOrder = {
      ...structuredClone(draft), id, orderId: id, status: 'New',
      serviceType: draft.serviceType ?? existing?.serviceType ?? 'Dine-in',
      createdAt: existing?.createdAt ?? now, updatedAt: now,
    };
    setOrders(current => existing ? current.map(order => order.id === id ? submitted : order) : [...current, submitted]);
    setDrafts(current => {
      const next = { ...current };
      delete next[draft.tableId];
      return next;
    });
    return id;
  }
  function advanceOrder(id: number) {
    const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = { New: 'Preparing', Preparing: 'Ready', Ready: 'Served' };
    setOrders(current => current.map(order => {
      const status = nextStatus[order.status];
      if (order.id !== id || !status) return order;
      const now = new Date().toISOString();
      return { ...order, status, updatedAt: now,
        ...(status === 'Preparing' ? { prepStartedAt: now } : {}),
        ...(status === 'Ready' ? { readyAt: now } : {}),
        ...(status === 'Served' ? { servedAt: now } : {}),
      };
    }));
  }
  function clearDraft(tableId: number) { setDrafts(current => { const next = { ...current }; delete next[tableId]; return next; }); }
  function finishOrder(id: number) { setOrders(current => current.map(order => order.id === id && order.status !== 'Served' ? { ...order, status: 'Served', servedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : order)); }
  return <OrderContext.Provider value={{ orders, drafts, saveDraft, sendToKitchen, advanceOrder, storageAvailable, finishOrder, clearDraft }}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const store = useContext(OrderContext);
  if (!store) throw new Error('useOrders must be used within OrderProvider');
  return store;
}
