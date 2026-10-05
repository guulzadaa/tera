import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { tables as seedTables, type RestaurantTable } from './mock';
import { useOrders } from './OrderContext';
import { usePayments } from './PaymentContext';
import { useMenu } from './MenuContext';

type Reservation = { customerName: string; reservationTime: string; guests: number };
const key = 'tera.reservations.v1';
function loadReservations(): Record<number, Reservation> {
  const defaults = Object.fromEntries(seedTables.filter(table => table.status === 'Reserved').map(table => [table.id, { customerName: table.customerName!, reservationTime: table.reservationTime!, guests: table.guests }]));
  try {
    const raw = localStorage.getItem(key); if (!raw) return defaults;
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.entries(value).every(([id, entry]) => {
      const table = seedTables.find(table => table.id === Number(id)); const reservation = entry as Reservation;
      return table && reservation && typeof reservation.customerName === 'string' && !!reservation.customerName.trim() && typeof reservation.reservationTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(reservation.reservationTime) && Number.isInteger(reservation.guests) && reservation.guests > 0 && reservation.guests <= table.seats;
    })) return defaults;
    return value;
  } catch { return defaults; }
}
type TableStore = { tables: RestaurantTable[]; updateTable: (id: number, changes: Partial<RestaurantTable>) => void; storageAvailable: boolean };
const TableContext = createContext<TableStore | null>(null);
export function TableProvider({ children }: { children: ReactNode }) {
  const orders = useOrders(); const payments = usePayments(); const menu = useMenu();
  const [reservations, setReservations] = useState(loadReservations);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(reservations)); setStorageAvailable(true); } catch { setStorageAvailable(false); } }, [reservations]);
  const unsettled = orders.orders.filter(order => !payments.transactions.some(payment => payment.orderId === order.id));
  const tables: RestaurantTable[] = seedTables.map(seed => {
    const order = [...unsettled].reverse().find(order => order.tableId === seed.id);
    const storedDraft = orders.drafts[seed.id];
    const draft = storedDraft?.orderId && payments.transactions.some(payment => payment.orderId === storedDraft.orderId) ? undefined : storedDraft;
    const visit = draft ?? order;
    if (visit) return { id: seed.id, seats: seed.seats, status: 'Occupied', guests: visit.guests, orderId: order ? `#${order.id}` : 'Draft', duration: order ? Math.max(0, Math.floor((Date.now() - Date.parse(order.createdAt)) / 60000)) : 0, items: visit.items };
    const reservation = reservations[seed.id];
    return { id: seed.id, seats: seed.seats, status: reservation ? 'Reserved' : 'Available', items: [], ...reservation, guests: reservation?.guests ?? 0 };
  });
  function updateTable(id: number, changes: Partial<RestaurantTable>) {
    const table = tables.find(table => table.id === id); if (!table) return;
    if (changes.status === 'Reserved') {
      if (!changes.customerName?.trim() || !changes.reservationTime || !changes.guests || changes.guests > table.seats) return;
      setReservations(current => ({ ...current, [id]: { customerName: changes.customerName!.trim(), reservationTime: changes.reservationTime!, guests: changes.guests! } })); return;
    }
    if (changes.status === 'Available' || changes.status === 'Occupied') setReservations(current => { const next = { ...current }; delete next[id]; return next; });
    if (changes.status === 'Available') { orders.clearDraft(id); return; }
    const order = [...unsettled].reverse().find(order => order.tableId === id);
    const existing = orders.drafts[id] ?? order;
    const items = changes.items ? changes.items.flatMap(line => {
      const saved = existing?.items.find(item => item.name === line.name);
      const dish = menu.items.find(item => item.name === line.name && item.available);
      return saved ? [{ ...saved, quantity: line.quantity }] : dish ? [{ menuItemId: dish.id, name: dish.name, price: dish.price, quantity: line.quantity }] : [];
    }) : existing?.items ?? [];
    orders.saveDraft({ tableId: id, guests: changes.guests ?? existing?.guests ?? 1, items, notes: existing?.notes ?? '', ...(order ? { orderId: order.id } : {}) });
  }
  return <TableContext.Provider value={{ tables, updateTable, storageAvailable }}>{children}</TableContext.Provider>;
}
export function useTables() { const store = useContext(TableContext); if (!store) throw new Error('useTables must be used within TableProvider'); return store; }
