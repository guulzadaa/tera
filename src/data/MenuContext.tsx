import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { posMenu } from './mock';
import { validMenuInput, type ManagedMenuItem, type MenuItemInput } from './menuModel';
import { loadMenu, persistMenu } from './menuStorage';

type MenuStore = { items: ManagedMenuItem[]; storageAvailable: boolean; saveItem: (input: MenuItemInput, id?: string) => boolean; setAvailability: (id: string, available: boolean) => void; deleteItem: (id: string) => void };
const MenuContext = createContext<MenuStore | null>(null);
export function MenuProvider({ children }: { children: ReactNode }) {
  // The original POS menu remains the single seed dataset; orders retain their own snapshots.
  const [items, setItems] = useState<ManagedMenuItem[]>(() => loadMenu() ?? posMenu.map(item => ({ ...item, available: true })));
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => { setStorageAvailable(persistMenu(items)); }, [items]);
  function saveItem(input: MenuItemInput, id?: string) {
    const normalized = { ...input, name: input.name.trim(), description: input.description.trim() };
    if (!validMenuInput(normalized) || (id && !items.some(item => item.id === id))) return false;
    const item = { ...normalized, id: id ?? crypto.randomUUID() };
    setItems(current => id ? current.map(entry => entry.id === id ? item : entry) : [...current, item]);
    return true;
  }
  return <MenuContext.Provider value={{ items, storageAvailable, saveItem, setAvailability: (id, available) => setItems(current => current.map(item => item.id === id ? { ...item, available } : item)), deleteItem: id => setItems(current => current.filter(item => item.id !== id)) }}>{children}</MenuContext.Provider>;
}
export function useMenu() {
  const store = useContext(MenuContext);
  if (!store) throw new Error('useMenu must be used within MenuProvider');
  return store;
}
