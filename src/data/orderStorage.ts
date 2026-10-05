import type { OrderDraft, RestaurantOrder } from './orderModel';

export const ORDER_STORAGE_KEY = 'tera.orders.v1';
type SavedOrders = { orders: RestaurantOrder[]; drafts: Record<number, OrderDraft> };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const timestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
function validDraft(value: unknown): value is OrderDraft {
  return record(value) && Number.isInteger(value.tableId) && Number(value.tableId) >= 1 && Number(value.tableId) <= 12 &&
    Number.isInteger(value.guests) && Number(value.guests) >= 1 && Number(value.guests) <= 6 && typeof value.notes === 'string' &&
    (value.orderId === undefined || Number.isInteger(value.orderId)) &&
    (value.serviceType === undefined || value.serviceType === 'Dine-in' || value.serviceType === 'Takeaway') &&
    Array.isArray(value.items) && value.items.every(item => record(item) && typeof item.menuItemId === 'string' &&
      typeof item.name === 'string' && typeof item.price === 'number' && Number.isSafeInteger(item.price) && item.price >= 0 &&
      Number.isSafeInteger(item.quantity) && Number(item.quantity) > 0 && Number.isSafeInteger(item.price * Number(item.quantity))) &&
    new Set(value.items.map(item => item.menuItemId)).size === value.items.length;
}
function validOrder(value: unknown): value is RestaurantOrder {
  if (!record(value)) return false;
  const entry: Record<string, unknown> = value;
  return validDraft(value) && Number.isInteger(entry.id) &&
    ['New', 'Preparing', 'Ready', 'Served'].includes(String(entry.status)) && timestamp(entry.createdAt) && timestamp(entry.updatedAt) &&
    ['prepStartedAt', 'readyAt', 'servedAt'].every(key => entry[key] === undefined || timestamp(entry[key]));
}
export function loadOrders(): SavedOrders | null {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!record(value) || !Array.isArray(value.orders) || !value.orders.every(validOrder) || !record(value.drafts) ||
      !Object.entries(value.drafts).every(([key, draft]) => validDraft(draft) && String(draft.tableId) === key) ||
      new Set(value.orders.map(order => order.id)).size !== value.orders.length) return null;
    return { orders: value.orders, drafts: value.drafts as Record<number, OrderDraft> };
  } catch { return null; }
}
export function persistOrders(value: SavedOrders): boolean {
  try { localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(value)); return true; }
  catch { return false; }
}
