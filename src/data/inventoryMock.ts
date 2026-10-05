import { stockStatus, type InventoryCategory, type InventoryItem, type InventoryState, type StockUnit } from './inventoryModel';

type IngredientSeed = [string, string, InventoryCategory, number, StockUnit, number];
const ingredients: IngredientSeed[] = [
  ['salmon', 'Salmon Fillet', 'Seafood', 8.5, 'kg', 10],
  ['ribeye', 'Ribeye Beef', 'Meat', 14, 'kg', 8],
  ['chicken', 'Chicken Breast', 'Meat', 18, 'kg', 10],
  ['tomatoes', 'Tomatoes', 'Vegetables', 4, 'kg', 6],
  ['parmesan', 'Parmesan', 'Dairy', 2.5, 'kg', 4],
  ['pasta', 'Pasta', 'Dry Goods', 12, 'kg', 5],
  ['water', 'Sparkling Water', 'Beverages', 32, 'bottles', 20],
  ['coffee', 'Coffee Beans', 'Beverages', 3, 'kg', 4],
  ['prawns', 'Tiger Prawns', 'Seafood', 6, 'kg', 4],
  ['mussels', 'Mussels', 'Seafood', 3.5, 'kg', 4],
  ['wagyu', 'Wagyu Mince', 'Meat', 9, 'kg', 5],
  ['lettuce', 'Romaine Lettuce', 'Vegetables', 5, 'kg', 3],
  ['mushrooms', 'Wild Mushrooms', 'Vegetables', 2.2, 'kg', 3],
  ['onions', 'Red Onions', 'Vegetables', 8, 'kg', 4],
  ['potatoes', 'Potatoes', 'Vegetables', 22, 'kg', 10],
  ['cream', 'Heavy Cream', 'Dairy', 4.5, 'L', 4],
  ['mozzarella', 'Mozzarella', 'Dairy', 7, 'kg', 4],
  ['butter', 'Butter', 'Dairy', 6, 'kg', 3],
  ['flour', 'Flour', 'Dry Goods', 25, 'kg', 10],
  ['rice', 'Arborio Rice', 'Dry Goods', 8, 'kg', 4],
  ['oranges', 'Fresh Oranges', 'Beverages', 6, 'kg', 6],
  ['olive-oil', 'Olive Oil', 'Other', 1, 'L', 3],
  ['truffle', 'Truffle Paste', 'Other', 0.3, 'kg', 1],
  ['eggs', 'Free-range Eggs', 'Other', 80, 'pieces', 40],
];
const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
export const inventoryItems: InventoryItem[] = ingredients.map(([id, name, category, currentStock, unit, minimumStock], index) => ({
  id, name, category, currentStock, unit, minimumStock,
  status: stockStatus(currentStock, minimumStock), lastUpdated: ago(20 + index * 15),
}));
export const initialInventory: InventoryState = {
  items: inventoryItems,
  activity: [
    { id: 'seed-salmon', ingredientId: 'salmon', ingredientName: 'Salmon Fillet', unit: 'kg', delta: 5, previousStock: 3.5, newStock: 8.5, reason: 'Stock delivery', timestamp: inventoryItems[0].lastUpdated },
    { id: 'seed-tomatoes', ingredientId: 'tomatoes', ingredientName: 'Tomatoes', unit: 'kg', delta: -2, previousStock: 6, newStock: 4, reason: 'Waste', timestamp: inventoryItems[3].lastUpdated },
    { id: 'seed-coffee', ingredientId: 'coffee', ingredientName: 'Coffee Beans', unit: 'kg', delta: 1, previousStock: 2, newStock: 3, reason: 'Stock delivery', timestamp: ago(1300) },
  ],
};
