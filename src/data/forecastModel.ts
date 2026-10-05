import type { InventoryItem } from './inventoryModel';

export type ForecastHorizon = 7 | 14 | 30;
export type ForecastDay = { date: string; baseline: number; orders: number; guests: number; revenue: number; confidence: number; lower: number; upper: number };
export type IngredientRecommendation = { ingredient: InventoryItem; need: number; purchase: number; priority: 'High' | 'Medium' | 'Low'; action: 'Order' | 'Monitor' | 'Stock sufficient' };

// Illustrative consumption per restaurant order, in each inventory item's own unit.
// These are demo assumptions, not production recipes or measured stock usage.
export const demoUsagePerOrder: Record<string, number> = {
  salmon: .035, ribeye: .028, chicken: .03, tomatoes: .025, parmesan: .008,
  pasta: .03, water: .65, coffee: .009, prawns: .016, mussels: .012,
  wagyu: .025, lettuce: .016, mushrooms: .012, onions: .01, potatoes: .04,
  cream: .012, mozzarella: .012, butter: .008, flour: .035, rice: .01,
  oranges: .025, 'olive-oil': .004, truffle: .001, eggs: .4,
};
