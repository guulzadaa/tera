export const inventoryCategories = ['Meat', 'Seafood', 'Vegetables', 'Dairy', 'Dry Goods', 'Beverages', 'Other'] as const;
export type InventoryCategory = (typeof inventoryCategories)[number];
export type StockStatus = 'Healthy' | 'Low Stock' | 'Critical';
export type StockUnit = 'kg' | 'L' | 'bottles' | 'pieces';
export const stockReasons = ['Stock delivery', 'Manual correction', 'Waste', 'Spoilage', 'Other'] as const;
export type StockReason = (typeof stockReasons)[number];
export type InventoryItem = {
  id: string; name: string; category: InventoryCategory; currentStock: number;
  unit: StockUnit; minimumStock: number; status: StockStatus; lastUpdated: string;
};
export type InventoryActivity = {
  id: string; ingredientId: string; ingredientName: string; unit: StockUnit;
  delta: number; previousStock: number; newStock: number; reason: StockReason; timestamp: string;
};
export type InventoryState = { items: InventoryItem[]; activity: InventoryActivity[] };

// A 20% buffer is healthy; <= 62.5% of minimum is critical (e.g. parmesan 2.5 / 4 kg).
export function stockStatus(currentStock: number, minimumStock: number): StockStatus {
  if (currentStock <= minimumStock * 0.625) return 'Critical';
  return currentStock < minimumStock * 1.2 ? 'Low Stock' : 'Healthy';
}
export const stockQuantity = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
export function stockTimestamp(value: string) {
  const date = new Date(value);
  const dateKey = (entry: Date) => entry.toLocaleDateString('en-CA', { timeZone: 'Asia/Yekaterinburg' });
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const day = dateKey(date) === dateKey(today) ? 'Today' : dateKey(date) === dateKey(yesterday) ? 'Yesterday' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Yekaterinburg' });
  return `${day}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Yekaterinburg' })}`;
}
