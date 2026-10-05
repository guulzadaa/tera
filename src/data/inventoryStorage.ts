import { inventoryCategories, stockReasons, stockStatus, type InventoryState } from './inventoryModel';
import { inventoryItems } from './inventoryMock';

export const INVENTORY_STORAGE_KEY = 'tera.inventory.v1';
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function loadInventory(): InventoryState | null {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!record(data) || !Array.isArray(data.items) || !Array.isArray(data.activity)) return null;
    if (data.items.length !== inventoryItems.length || new Set(data.items.map(item => item?.id)).size !== inventoryItems.length || !data.items.every(item => record(item) && inventoryItems.some(seed => seed.id === item.id && seed.unit === item.unit) && typeof item.name === 'string' && inventoryCategories.includes(item.category as never) && nonnegative(item.currentStock) && nonnegative(item.minimumStock) && item.minimumStock > 0 && date(item.lastUpdated))) return null;
    if (!data.activity.every(entry => record(entry) && typeof entry.id === 'string' && inventoryItems.some(item => item.id === entry.ingredientId && item.unit === entry.unit) && typeof entry.ingredientName === 'string' && typeof entry.delta === 'number' && Number.isFinite(entry.delta) && nonnegative(entry.previousStock) && nonnegative(entry.newStock) && Math.abs(entry.newStock - entry.previousStock - entry.delta) < 0.001 && stockReasons.includes(entry.reason as never) && date(entry.timestamp))) return null;
    const saved = data as unknown as InventoryState;
    return { items: saved.items.map(item => ({ ...item, status: stockStatus(item.currentStock, item.minimumStock) })), activity: saved.activity };
  } catch { return null; }
}
export function persistInventory(state: InventoryState): boolean {
  try { localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
