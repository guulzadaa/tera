import { validMenuInput, type ManagedMenuItem } from './menuModel';

export const MENU_STORAGE_KEY = 'tera.menu.v1';
export function loadMenu(): ManagedMenuItem[] | null {
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(item => item && typeof item === 'object' && typeof item.id === 'string' && item.id.trim() && typeof item.name === 'string' && typeof item.description === 'string' && validMenuInput(item)) || new Set(value.map(item => item.id)).size !== value.length) return null;
    return value;
  } catch { return null; }
}
export function persistMenu(items: ManagedMenuItem[]) {
  try { localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(items)); return true; }
  catch { return false; }
}
