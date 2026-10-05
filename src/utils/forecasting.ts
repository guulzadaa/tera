import { dayOffset, sumDays, type AnalyticsDay } from '../data/analyticsModel';
import { demoUsagePerOrder, type ForecastDay, type ForecastHorizon, type IngredientRecommendation } from '../data/forecastModel';
import type { InventoryItem } from '../data/inventoryModel';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const forecastDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

// Deterministic prototype output. There is no training, inference service or external API.
// Weekday averages and a bounded recent demo sales trend drive each future day.
export function calculateForecast(history: AnalyticsDay[], inventory: InventoryItem[], today: string, horizon: ForecastHorizon) {
  const recent = history.filter(day => day.date >= dayOffset(today, -28) && day.date < today);
  const latest = recent.filter(day => day.date >= dayOffset(today, -7));
  const prior = recent.filter(day => day.date >= dayOffset(today, -14) && day.date < dayOffset(today, -7));
  const latestRevenue = sumDays(latest).revenue;
  const priorRevenue = sumDays(prior).revenue;
  // A disclosed 4% demo planning allowance makes the forecast scenario distinct from baseline.
  const multiplier = (priorRevenue ? clamp(latestRevenue / priorRevenue, .92, 1.12) : 1) * 1.04;
  const totals = sumDays(recent);
  const averageValue = totals.average;
  const guestsPerOrder = totals.orders ? totals.guests / totals.orders : 2;
  const days: ForecastDay[] = Array.from({ length: horizon }, (_, index) => {
    const date = dayOffset(today, index + 1);
    const sameWeekday = recent.filter(day => weekday(day.date) === weekday(date));
    const baseline = Math.round(sameWeekday.length ? sameWeekday.reduce((sum, day) => sum + day.orders, 0) / sameWeekday.length : totals.orders / Math.max(1, recent.length));
    const orders = Math.round(baseline * multiplier);
    // Display-only illustrative confidence decreases with distance, never a validated score.
    const confidence = Math.round(clamp(89 - index * .45, 73, 89));
    const spread = .14 + index * .004;
    return { date, baseline, orders, guests: Math.round(orders * guestsPerOrder), revenue: Math.round(orders * averageValue / 1000) * 1000, confidence, lower: Math.floor(orders * (1 - spread)), upper: Math.ceil(orders * (1 + spread)) };
  });
  const predictedOrders = days.reduce((sum, day) => sum + day.orders, 0);
  const baselineOrders = days.reduce((sum, day) => sum + day.baseline, 0);
  const dishMap = new Map<string, { id: string; name: string; historical: number }>();
  recent.flatMap(day => day.dishes).forEach(dish => {
    const entry = dishMap.get(dish.menuItemId) ?? { id: dish.menuItemId, name: dish.name, historical: 0 };
    entry.historical += dish.quantity; dishMap.set(entry.id, entry);
  });
  const dishes = Array.from(dishMap.values()).map(dish => {
    const baseline = totals.orders ? dish.historical / totals.orders * baselineOrders : 0;
    const quantity = Math.round(totals.orders ? dish.historical / totals.orders * predictedOrders : 0);
    return { ...dish, quantity, change: baseline ? Math.round((quantity / baseline - 1) * 1000) / 10 : 0 };
  }).sort((a, b) => b.quantity - a.quantity);
  const recommendations = inventory.map<IngredientRecommendation>(ingredient => {
    const usage = demoUsagePerOrder[ingredient.id] ?? 0;
    const integral = ingredient.unit === 'bottles' || ingredient.unit === 'pieces';
    const need = integral ? Math.ceil(predictedOrders * usage) : Math.ceil(predictedOrders * usage * 10) / 10;
    const deficit = Math.max(0, need - ingredient.currentStock);
    const purchase = integral ? Math.ceil(deficit) : Math.ceil(deficit * 10 - 1e-8) / 10;
    const action = deficit > 0 ? 'Order' : ingredient.currentStock < need * 1.15 ? 'Monitor' : 'Stock sufficient';
    return { ingredient, need, purchase, action, priority: action === 'Order' ? 'High' : action === 'Monitor' ? 'Medium' : 'Low' };
  }).sort((a, b) => ['High', 'Medium', 'Low'].indexOf(a.priority) - ['High', 'Medium', 'Low'].indexOf(b.priority) || a.ingredient.name.localeCompare(b.ingredient.name));
  const peak = days.reduce((best, day) => day.orders > best.orders ? day : best, days[0]);
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: recent.reduce((sum, day) => sum + day.hours[hour], 0) }));
  const peakHour = hours.reduce((best, hour) => hour.count > best.count ? hour : best, hours[0]).hour;
  const shortage = recommendations.find(item => item.action === 'Order');
  const sufficient = recommendations.find(item => item.action === 'Stock sufficient');
  const insights = [
    `${forecastDate(peak.date)} is expected to be busiest, with approximately ${peak.orders} orders.`,
    dishes.length ? `${dishes[0].name} leads the dish forecast with ${dishes[0].quantity} expected servings over ${horizon} days.` : 'More historical dishes are needed for menu recommendations.',
    shortage ? `${shortage.ingredient.name} may run short: ${shortage.purchase} ${shortage.ingredient.unit} additional stock is recommended.` : 'Current stock covers the illustrative ingredient requirements.',
    `The historical dinner peak is around ${String(peakHour).padStart(2, '0')}:00; plan staffing around this window.`,
    sufficient ? `${sufficient.ingredient.name} has sufficient stock for the selected horizon.` : 'Review purchasing before service: all tracked ingredients need ordering or monitoring.',
  ];
  return { days, dishes, recommendations, peak, peakHour, insights, baselineOrders, predictedOrders, revenue: days.reduce((sum, day) => sum + day.revenue, 0), guests: days.reduce((sum, day) => sum + day.guests, 0), confidence: Math.round(days.reduce((sum, day) => sum + day.confidence, 0) / horizon), change: baselineOrders ? (predictedOrders / baselineOrders - 1) * 100 : 0, multiplier, historyDays: recent.length };
}
