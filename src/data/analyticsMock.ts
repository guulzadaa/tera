import { posMenu } from './mock';
import { dayOffset, type AnalyticsDay } from './analyticsModel';

// Deterministic daily demo aggregates, shared with future forecasting. No storage writes.
export function createAnalyticsHistory(today: string): AnalyticsDay[] {
  return Array.from({ length: 60 }, (_, index) => {
    const date = dayOffset(today, -index - 1);
    const seed = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000);
    const weekend = [0, 5, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
    const orders = 38 + seed % 19 + (weekend ? 18 : 0);
    const dishes = posMenu.map((item, i) => ({ menuItemId: item.id, name: item.name, price: item.price, quantity: 2 + (seed + i * 7) % 9 + (['salmon', 'caesar', 'truffle'].includes(item.id) ? 12 : 0) }));
    const subtotal = dishes.reduce((sum, dish) => sum + dish.price * dish.quantity, 0);
    const hours = Array<number>(24).fill(0);
    const weights = [2, 5, 6, 4, 3, 4, 7, 10, 12, 7, 3];
    let remaining = orders;
    weights.forEach((weight, i) => { const count = i === weights.length - 1 ? remaining : Math.floor(orders * weight / 63); hours[12 + i] = count; remaining -= count; });
    return { date, revenue: subtotal + Math.round(subtotal * .1), orders, paidOrders: orders, guests: orders * 2 + seed % 17, dishes, hours, source: 'Demo history' };
  });
}
