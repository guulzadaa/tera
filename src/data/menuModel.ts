import { menuCategories, type MenuItem } from './orderModel';

export type ManagedMenuItem = MenuItem & { available: boolean };
export type MenuItemInput = Omit<ManagedMenuItem, 'id'>;
export function validMenuInput(value: MenuItemInput) {
  return !!value.name.trim() && value.name.length <= 100 && value.description.length <= 400 &&
    menuCategories.some(category => category !== 'All' && category === value.category) &&
    Number.isSafeInteger(value.price) && value.price > 0 && typeof value.available === 'boolean';
}
