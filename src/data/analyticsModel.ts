import { posMenu } from './mock';
import { menuCategories, type OrderLine, type RestaurantOrder } from './orderModel';
import { paymentDay, paymentMethods, type PaymentTransaction } from './paymentModel';

export type AnalyticsRange = 1 | 7 | 30;
export type AnalyticsDay = { date: string; revenue: number; orders: number; paidOrders: number; guests: number; dishes: OrderLine[]; hours: number[]; source: 'Live' | 'Demo history' };
export function dayOffset(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}
export function restaurantHour(date: string) {
  return Number(new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Yekaterinburg' }));
}
export const sumDays = (days: AnalyticsDay[]) => {
  const revenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const orders = days.reduce((sum, day) => sum + day.orders, 0);
  const paidOrders = days.reduce((sum, day) => sum + day.paidOrders, 0);
  return { revenue, orders, guests: days.reduce((sum, day) => sum + day.guests, 0), average: paidOrders ? Math.round(revenue / paidOrders) : 0 };
};
export function buildAnalytics(range: AnalyticsRange, history: AnalyticsDay[], orders: RestaurantOrder[], transactions: PaymentTransaction[], today = paymentDay(new Date().toISOString())) {
  const start = dayOffset(today, 1 - range);
  const previousStart = dayOffset(start, -range);
  const paid = transactions.filter(transaction => transaction.status === 'Paid');
  // A paid snapshot may outlive its operational order. Count each order ID once.
  const records = new Map<number, { date: string; guests: number; time: string; tableId: number }>();
  orders.forEach(order => records.set(order.id, { date: paymentDay(order.createdAt), guests: order.guests, time: order.createdAt, tableId: order.tableId }));
  transactions.forEach(transaction => {
    if (!records.has(transaction.orderId)) records.set(transaction.orderId, { date: paymentDay(transaction.paidAt), guests: transaction.guests, time: transaction.paidAt, tableId: transaction.tableId });
  });
  const liveDates = new Set([today, ...Array.from(records.values(), record => record.date), ...transactions.map(transaction => paymentDay(transaction.paidAt))]);
  function getDay(date: string): AnalyticsDay {
    if (!liveDates.has(date)) return history.find(day => day.date === date) ?? { date, revenue: 0, orders: 0, paidOrders: 0, guests: 0, dishes: [], hours: Array(24).fill(0), source: 'Demo history' };
    const dayOrders = Array.from(records.values()).filter(record => record.date === date);
    const payments = paid.filter(transaction => paymentDay(transaction.paidAt) === date);
    const hours = Array<number>(24).fill(0);
    dayOrders.forEach(record => hours[restaurantHour(record.time)]++);
    return { date, revenue: payments.reduce((sum, transaction) => sum + transaction.total, 0), orders: dayOrders.length, paidOrders: payments.length, guests: payments.reduce((sum, transaction) => sum + transaction.guests, 0), dishes: payments.flatMap(transaction => transaction.items), hours, source: 'Live' };
  }
  const days = Array.from({ length: range }, (_, i) => getDay(dayOffset(start, i)));
  const previous = Array.from({ length: range }, (_, i) => getDay(dayOffset(previousStart, i)));
  const dishMap = new Map<string, { name: string; quantity: number; revenue: number; category: string }>();
  days.flatMap(day => day.dishes).forEach(line => {
    const dish = dishMap.get(line.menuItemId) ?? { name: line.name, quantity: 0, revenue: 0, category: posMenu.find(item => item.id === line.menuItemId)?.category ?? 'Other' };
    dish.quantity += line.quantity; dish.revenue += line.price * line.quantity;
    dishMap.set(line.menuItemId, dish);
  });
  const dishes = Array.from(dishMap.values()).sort((a, b) => b.quantity - a.quantity);
  const categories = [...menuCategories.filter(category => category !== 'All'), 'Other'].map(name => ({ name, revenue: dishes.filter(dish => dish.category === name).reduce((sum, dish) => sum + dish.revenue, 0) })).filter(category => category.name !== 'Other' || category.revenue > 0);
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: days.reduce((sum, day) => sum + day.hours[hour], 0) }));
  const methods = paymentMethods.map(name => ({ name, revenue: paid.filter(transaction => paymentDay(transaction.paidAt) >= start && paymentDay(transaction.paidAt) <= today && transaction.method === name).reduce((sum, transaction) => sum + transaction.total, 0) }));
  const tables = Array.from({ length: 12 }, (_, index) => {
    const id = index + 1;
    return { id, orders: Array.from(records.values()).filter(record => record.date >= start && record.date <= today && record.tableId === id).length, revenue: paid.filter(transaction => paymentDay(transaction.paidAt) >= start && paymentDay(transaction.paidAt) <= today && transaction.tableId === id).reduce((sum, transaction) => sum + transaction.total, 0) };
  });
  const durations = orders.filter(order => paymentDay(order.createdAt) >= start && paymentDay(order.createdAt) <= today && order.servedAt).map(order => (Date.parse(order.servedAt!) - Date.parse(order.createdAt)) / 60000).filter(minutes => minutes >= 0);
  return { days, previous: sumDays(previous), totals: sumDays(days), dishes, categories, hours, methods, tables, turnover: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null };
}
