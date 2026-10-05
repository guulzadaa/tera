import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initialInventory } from './inventoryMock';
import { loadInventory, persistInventory } from './inventoryStorage';
import { stockStatus, type InventoryState, type StockReason } from './inventoryModel';

type InventoryStore = InventoryState & {
  changeStock: (id: string, quantity: number, reason: StockReason, operation: 'add' | 'set') => boolean;
  storageAvailable: boolean;
};
const InventoryContext = createContext<InventoryStore | null>(null);
export function InventoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InventoryState>(() => loadInventory() ?? initialInventory);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => { setStorageAvailable(persistInventory(state)); }, [state]);
  function changeStock(id: string, quantity: number, reason: StockReason, operation: 'add' | 'set') {
    const ingredient = state.items.find(item => item.id === id);
    if (!ingredient || !Number.isFinite(quantity) || quantity < 0 || (operation === 'add' && quantity === 0) || ((ingredient.unit === 'pieces' || ingredient.unit === 'bottles') && !Number.isInteger(quantity))) return false;
    const candidate = operation === 'add' ? ingredient.currentStock + quantity : quantity;
    if (!Number.isSafeInteger(Math.round(candidate * 100))) return false;
    setState(current => {
      const item = current.items.find(entry => entry.id === id)!;
      const newStock = Math.round((operation === 'add' ? item.currentStock + quantity : quantity) * 100) / 100;
      const timestamp = new Date().toISOString();
      return {
        items: current.items.map(entry => entry.id === id ? { ...entry, currentStock: newStock, status: stockStatus(newStock, entry.minimumStock), lastUpdated: timestamp } : entry),
        activity: [{ id: crypto.randomUUID(), ingredientId: id, ingredientName: item.name, unit: item.unit, delta: Math.round((newStock - item.currentStock) * 100) / 100, previousStock: item.currentStock, newStock, reason, timestamp }, ...current.activity],
      };
    });
    return true;
  }
  return <InventoryContext.Provider value={{ ...state, changeStock, storageAvailable }}>{children}</InventoryContext.Provider>;
}
export function useInventory() {
  const store = useContext(InventoryContext);
  if (!store) throw new Error('useInventory must be used within InventoryProvider');
  return store;
}
