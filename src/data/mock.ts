import type { MenuItem, RestaurantOrder } from './orderModel';

export type TableStatus = 'Available' | 'Occupied' | 'Reserved';
export type TableOrderItem = { name: string; price: number; quantity: number };
export type RestaurantTable = {
  id: number;
  seats: number;
  status: TableStatus;
  guests: number;
  orderId?: string;
  duration?: number;
  items: TableOrderItem[];
  reservationTime?: string;
  customerName?: string;
};

// Floor geometry and initial reservations only. Operational occupancy is derived in TableContext.
export const tables: RestaurantTable[] = [
  { id: 1, seats: 4, status: 'Available', guests: 0, items: [] },
  { id: 2, seats: 4, status: 'Available', guests: 0, items: [] },
  { id: 3, seats: 2, status: 'Reserved', guests: 2, reservationTime: '19:30', customerName: 'Aigerim Sadykova', items: [] },
  { id: 4, seats: 6, status: 'Available', guests: 0, items: [] },
  { id: 5, seats: 2, status: 'Available', guests: 0, items: [] },
  { id: 6, seats: 4, status: 'Available', guests: 0, items: [] },
  { id: 7, seats: 6, status: 'Reserved', guests: 5, reservationTime: '20:00', customerName: 'Daniyar Ospanov', items: [] },
  { id: 8, seats: 4, status: 'Available', guests: 0, items: [] },
  { id: 9, seats: 2, status: 'Available', guests: 0, items: [] },
  { id: 10, seats: 4, status: 'Available', guests: 0, items: [] },
  { id: 11, seats: 6, status: 'Available', guests: 0, items: [] },
  { id: 12, seats: 4, status: 'Available', guests: 0, items: [] },
];
export const posMenu: MenuItem[] = [
  { id: 'bruschetta', name: 'Bruschetta', description: 'Toasted sourdough, ripe tomatoes, basil oil.', category: 'Starters', price: 2900 },
  { id: 'soup', name: 'Mushroom Soup', description: 'Velvety woodland mushrooms, herb cream.', category: 'Starters', price: 3200 },
  { id: 'burrata', name: 'Burrata', description: 'Creamy burrata, heirloom tomatoes, pesto.', category: 'Starters', price: 5100 },
  { id: 'caesar', name: 'Caesar Salad', description: 'Crisp romaine, parmesan, house dressing.', category: 'Salads', price: 4500 },
  { id: 'greek', name: 'Greek Salad', description: 'Feta, cucumber, olives, vine tomatoes.', category: 'Salads', price: 3900 },
  { id: 'salmon', name: 'Grilled Salmon', description: 'Atlantic salmon, lemon butter, greens.', category: 'Main Courses', price: 8900 },
  { id: 'steak', name: 'Ribeye Steak', description: 'Chargrilled ribeye, peppercorn jus.', category: 'Main Courses', price: 12500 },
  { id: 'chicken', name: 'Chicken Supreme', description: 'Roasted chicken, silky potato purée.', category: 'Main Courses', price: 6900 },
  { id: 'burger', name: 'Wagyu Burger', description: 'Brioche, aged cheddar, caramelized onion.', category: 'Main Courses', price: 5700 },
  { id: 'truffle', name: 'Truffle Pasta', description: 'Tagliatelle, forest mushrooms, black truffle.', category: 'Pasta', price: 7200 },
  { id: 'linguine', name: 'Seafood Linguine', description: 'Prawns, mussels, white wine, parsley.', category: 'Pasta', price: 8400 },
  { id: 'tiramisu', name: 'Tiramisu', description: 'Espresso-soaked sponge, mascarpone.', category: 'Desserts', price: 3800 },
  { id: 'fondant', name: 'Chocolate Fondant', description: 'Warm chocolate center, vanilla cream.', category: 'Desserts', price: 4200 },
  { id: 'cheesecake', name: 'Basque Cheesecake', description: 'Caramelized edges, berry compote.', category: 'Desserts', price: 3600 },
  { id: 'water', name: 'Sparkling Water', description: 'Chilled mineral water, 500 ml.', category: 'Drinks', price: 1500 },
  { id: 'orange', name: 'Fresh Orange Juice', description: 'Freshly squeezed, served over ice.', category: 'Drinks', price: 2400 },
  { id: 'coffee', name: 'Cappuccino', description: 'Double espresso, softly steamed milk.', category: 'Drinks', price: 1900 },
  { id: 'tonic', name: 'Citrus Tonic', description: 'Botanical tonic, grapefruit, rosemary.', category: 'Drinks', price: 1800 },
];

const seedLine = (id: string, quantity: number) => {
  const item = posMenu.find(entry => entry.id === id)!;
  return { menuItemId: id, name: item.name, price: item.price, quantity };
};
const seedTime = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
export const posOrders: RestaurantOrder[] = [
  { id: 1045, tableId: 2, guests: 3, status: 'Preparing', notes: '', createdAt: seedTime(24), updatedAt: seedTime(24), items: [seedLine('burger', 2), seedLine('caesar', 1), seedLine('water', 1)] },
  { id: 1046, tableId: 6, guests: 2, status: 'Ready', notes: 'Dressing on the side.', createdAt: seedTime(18), updatedAt: seedTime(5), items: [seedLine('chicken', 1), seedLine('greek', 1)] },
  { id: 1047, tableId: 4, guests: 4, status: 'New', notes: '', createdAt: seedTime(8), updatedAt: seedTime(8), items: [seedLine('salmon', 2), seedLine('caesar', 1), seedLine('water', 2)] },
  { id: 1044, tableId: 8, guests: 4, status: 'Preparing', notes: '', createdAt: seedTime(35), updatedAt: seedTime(35), items: [seedLine('truffle', 2), seedLine('tonic', 4)] },
  { id: 1043, tableId: 10, guests: 3, status: 'Ready', notes: '', createdAt: seedTime(55), updatedAt: seedTime(4), items: [seedLine('steak', 1), seedLine('caesar', 2)] },
  { id: 1042, tableId: 11, guests: 5, status: 'Preparing', notes: '', createdAt: seedTime(63), updatedAt: seedTime(63), items: [seedLine('burger', 5), seedLine('water', 3)] },
  { id: 1041, tableId: 5, guests: 2, status: 'Served', notes: '', createdAt: seedTime(90), updatedAt: seedTime(40), items: [seedLine('linguine', 2)] },
];

