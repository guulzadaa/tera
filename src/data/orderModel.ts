export const menuCategories = ['All', 'Starters', 'Salads', 'Main Courses', 'Pasta', 'Desserts', 'Drinks'] as const;
export type MenuCategory = Exclude<(typeof menuCategories)[number], 'All'>;
export type MenuItem = { id: string; name: string; description: string; category: MenuCategory; price: number };
export type OrderStatus = 'New' | 'Preparing' | 'Ready' | 'Served';
export type OrderLine = { menuItemId: string; name: string; price: number; quantity: number };
export type ServiceType = 'Dine-in' | 'Takeaway';
export type OrderDraft = { tableId: number; guests: number; items: OrderLine[]; notes: string; orderId?: number; serviceType?: ServiceType };
export type RestaurantOrder = OrderDraft & {
  id: number; status: OrderStatus; createdAt: string; updatedAt: string;
  prepStartedAt?: string; readyAt?: string; servedAt?: string;
};

export function orderTotals(items: OrderLine[]) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const service = Math.round(subtotal * 0.1);
  return { subtotal, service, total: subtotal + service };
}
export const formatKzt = (amount: number) => `₸${amount.toLocaleString('en-US')}`;
