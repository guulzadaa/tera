import { useEffect, useRef, useState } from 'react';
import { Armchair, ArrowRight, Check, ChefHat, Clock3, Coffee, Leaf, Minus, Plus, Save, Search, ShoppingBag, Soup, Trash2, UtensilsCrossed, Wine, CakeSlice, X } from 'lucide-react';
import { Badge, GlassButton, GlassCard, GlassPanel } from '../components/ui';
import { useTables } from '../data/TableContext';
import { usePayments } from '../data/PaymentContext';
import { useSearchParams } from 'react-router-dom';
import { useMenu } from '../data/MenuContext';
import { useOrders } from '../data/OrderContext';
import { formatKzt, menuCategories, orderTotals, type MenuCategory, type MenuItem, type OrderDraft, type RestaurantOrder } from '../data/orderModel';

const categoryIcons = { Starters: Soup, Salads: Leaf, 'Main Courses': UtensilsCrossed, Pasta: UtensilsCrossed, Desserts: CakeSlice, Drinks: Coffee };
const tableName = (id: number) => `Table ${String(id).padStart(2, '0')}`;
const statusTone = { New: 'blue', Preparing: 'orange', Ready: 'green', Served: 'neutral' } as const;
const draftFromOrder = (order: RestaurantOrder): OrderDraft => ({ tableId: order.tableId, guests: order.guests, items: structuredClone(order.items), notes: order.notes, orderId: order.id, serviceType: order.serviceType });

export default function OrdersPOS() {
  const store = useOrders();
  const { tables } = useTables();
  const { transactions } = usePayments();
  const [params] = useSearchParams();
  const menu = useMenu();
  const [view, setView] = useState<'pos' | 'active'>('pos');
  const [tableId, setTableId] = useState<number | null>(() => { const id = Number(params.get('table')); return tables.some(table => table.id === id) ? id : 4; });
  const [editors, setEditors] = useState<Record<number, OrderDraft>>({});
  const [category, setCategory] = useState<(typeof menuCategories)[number]>('All');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (sendTimer.current) clearTimeout(sendTimer.current); }, []);
  const selectedTable = tables.find(table => table.id === tableId);
  const unsettledOrders = store.orders.filter(order => !transactions.some(payment => payment.orderId === order.id));
  const activeOrders = unsettledOrders.filter(order => order.status !== 'Served');
  const existingOrder = [...unsettledOrders].reverse().find(order => order.tableId === tableId);
  const storedDraft = tableId === null ? undefined : editors[tableId] ?? store.drafts[tableId];
  const usableDraft = storedDraft?.orderId && transactions.some(payment => payment.orderId === storedDraft.orderId) ? undefined : storedDraft;
  const draft = tableId === null ? null : usableDraft ?? (existingOrder ? draftFromOrder(existingOrder) : { tableId, guests: 1, items: [], notes: '' });
  const totals = orderTotals(draft?.items ?? []);
  const filteredMenu = menu.items.filter(item => item.available && (category === 'All' || item.category === category) && `${item.name} ${item.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  const isReserved = selectedTable?.status === 'Reserved' && !existingOrder;

  function updateDraft(changes: Partial<OrderDraft>) {
    if (!draft || tableId === null) return;
    setEditors(current => ({ ...current, [tableId]: { ...draft, ...changes } }));
  }
  function addItem(item: MenuItem) {
    if (!menu.items.some(entry => entry.id === item.id && entry.available)) return;
    if (!draft) { setNotice({ text: 'Select a table before adding dishes.', error: true }); return; }
    if (isReserved) { setNotice({ text: 'This table is reserved. Select an available or occupied table.', error: true }); return; }
    const line = draft.items.find(entry => entry.menuItemId === item.id);
    updateDraft({ items: line ? draft.items.map(entry => entry.menuItemId === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...draft.items, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }] });
    setNotice(null);
  }
  function quantity(id: string, change: number) {
    if (!draft) return;
    if (change > 0 && !menu.items.some(item => item.id === id && item.available)) { setNotice({ text: 'This dish is no longer available for ordering.', error: true }); return; }
    updateDraft({ items: draft.items.map(item => item.menuItemId === id ? { ...item, quantity: item.quantity + change } : item).filter(item => item.quantity > 0) });
  }
  function validate() {
    if (!draft) { setNotice({ text: 'Select a table before saving or sending an order.', error: true }); return false; }
    if (isReserved) { setNotice({ text: 'This table is reserved. Choose another table to begin service.', error: true }); return false; }
    if (!Number.isInteger(draft.guests) || draft.guests < 1 || draft.guests > (selectedTable?.seats ?? 6)) { setNotice({ text: 'Choose a guest count within this table’s seating capacity.', error: true }); return false; }
    if (!draft.items.length) { setNotice({ text: 'Add at least one item to the order.', error: true }); return false; }
    // Existing order snapshots remain valid, but saved drafts cannot add unavailable dishes.
    if (draft.items.some(line => !menu.items.some(item => item.id === line.menuItemId && item.available) && line.quantity > (existingOrder?.items.find(item => item.menuItemId === line.menuItemId)?.quantity ?? 0))) { setNotice({ text: 'Remove newly added unavailable dishes before saving or sending.', error: true }); return false; }
    return true;
  }
  function save() {
    if (!validate() || !draft) return;
    store.saveDraft(draft);
    setNotice({ text: `${tableName(draft.tableId)} order saved as a draft.` });
  }
  function send() {
    if (sending || !validate() || !draft) return;
    setSending(true);
    // Commit immediately so navigating to KDS cannot cancel a submitted order.
    const id = store.sendToKitchen(draft);
    setEditors(current => { const next = { ...current }; delete next[draft.tableId]; return next; });
    setTableId(null);
    setNotice({ text: `Order #${id} sent to kitchen` });
    sendTimer.current = setTimeout(() => {
    setSending(false); sendTimer.current = null;
    }, 350);
  }
  function selectTable(value: string) { setTableId(value ? Number(value) : null); setNotice(null); }
  function tableStatus(id: number) { return activeOrders.some(order => order.tableId === id) ? 'Occupied' : tables.find(table => table.id === id)!.status; }
  function openOrder(order: RestaurantOrder) {
    setEditors(current => ({ ...current, [order.tableId]: current[order.tableId] ?? store.drafts[order.tableId] ?? draftFromOrder(order) }));
    setTableId(order.tableId); setView('pos'); setNotice(null);
  }

  return (
    <div className="pos-page">
      <div className="page-heading">
        <div><div className="eyebrow">THOUGHTFUL SERVICE STARTS HERE</div><h1>Orders & POS</h1><p>Create and manage restaurant orders.</p></div>
        <div className="heading-actions"><span className="table-occupancy"><span className="occupancy-dot"/>{activeOrders.length} Active Orders</span><GlassButton className="primary" onClick={() => { setView('pos'); setTableId(null); setNotice(null); }}><Plus size={16}/>New Order</GlassButton></div>
      </div>

      <div className="pos-segments" role="group" aria-label="Order views">
        <GlassButton aria-pressed={view === 'pos'} className={view === 'pos' ? 'is-selected' : ''} onClick={() => setView('pos')}><UtensilsCrossed size={15}/>New Order</GlassButton>
        <GlassButton aria-pressed={view === 'active'} className={view === 'active' ? 'is-selected' : ''} onClick={() => setView('active')}><ShoppingBag size={15}/>Active Orders<span>{activeOrders.length}</span></GlassButton>
      </div>

      {notice && <div className={`pos-notice ${notice.error ? 'is-error' : ''}`} role={notice.error ? 'alert' : 'status'}><span className="pos-notice-icon">{notice.error ? <Armchair size={18}/> : <Check size={18}/>}</span><div><strong>{notice.error ? 'A quick check' : 'All set'}</strong><p>{notice.text}</p></div><button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={16}/></button></div>}

      {view === 'active' ? (
        <GlassPanel className="pos-active-section">
          <div className="card-heading"><div><h2>Active Orders</h2><p>From first dish to final service.</p></div><span className="tiny-label">{activeOrders.length} IN SERVICE</span></div>
          {!activeOrders.length && <div className="tables-empty"><ShoppingBag size={25}/><h3>No active orders</h3><p>Start an order for an available table to begin service.</p></div>}
          <div className="pos-active-grid">
            {[...store.orders].sort((a, b) => b.id - a.id).map(order => (
              <GlassCard className="pos-active-card" key={order.id}>
                <div className="card-heading"><h3>#{order.id}</h3><Badge tone={transactions.find(payment => payment.orderId === order.id)?.status === 'Paid' ? 'green' : transactions.some(payment => payment.orderId === order.id) ? 'neutral' : statusTone[order.status]}><i/>{transactions.find(payment => payment.orderId === order.id)?.status ?? order.status}</Badge></div>
                <p className="pos-order-table"><Armchair size={15}/>{tableName(order.tableId)}<span>{order.guests} guests</span></p>
                <div className="pos-active-meta"><span><Clock3 size={12}/>{new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Yekaterinburg' })}</span><strong>{formatKzt(orderTotals(order.items).total)}</strong></div>
                <small>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items · includes 10% service</small>
                {order.status !== 'Served' && !transactions.some(payment => payment.orderId === order.id) && <GlassButton className="subtle" onClick={() => openOrder(order)}>Open order<ArrowRight size={14}/></GlassButton>}
              </GlassCard>
            ))}
          </div>
          <p className="pos-local-note">Includes served orders for reference. Orders and saved drafts stay available across routes and are saved on this device when local storage is available.</p>
        </GlassPanel>
      ) : (
        <>
          <GlassPanel className="pos-table-bar">
            <label htmlFor="pos-table"><Armchair size={17}/>Select Table</label>
            <select id="pos-table" value={tableId ?? ''} onChange={event => selectTable(event.target.value)}>
              <option value="">Choose a table</option>
              {tables.map(table => <option key={table.id} value={table.id}>{tableName(table.id)} · {tableStatus(table.id)} · {table.seats} seats</option>)}
            </select>
            <span className="pos-table-hint">{isReserved ? 'Reserved — choose another table to take an order.' : existingOrder ? `Editing order #${existingOrder.id}` : selectedTable ? 'A fresh order for your next guests.' : 'Select a table to begin service.'}</span>
          </GlassPanel>

          <div className="pos-workspace">
            <GlassPanel className="pos-menu-panel">
              <div className="card-heading"><div><h2>The Menu</h2><p>Made with care. Served with intention.</p></div><Wine size={20} className="pos-heading-icon"/></div>
              <label className="table-search pos-menu-search"><Search size={16}/><input aria-label="Search menu" placeholder="Search menu..." value={search} onChange={event => setSearch(event.target.value)}/>{search && <button className="icon-button" aria-label="Clear menu search" onClick={() => setSearch('')}><X size={14}/></button>}</label>
              <div className="pos-category-filters" role="group" aria-label="Menu categories">
                {menuCategories.map(name => <GlassButton key={name} className={`table-filter ${name === category ? 'is-selected' : ''}`} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</GlassButton>)}
              </div>
              <div className="pos-menu-grid">
                {filteredMenu.map(item => {
                  const Icon = categoryIcons[item.category as MenuCategory];
                  const count = draft?.items.find(line => line.menuItemId === item.id)?.quantity ?? 0;
                  return <GlassCard className="pos-menu-item" key={item.id}>
                    <button className="pos-dish-select" onClick={() => addItem(item)} aria-label={`Add ${item.name}`} disabled={isReserved}>
                      <div className="pos-dish-art"><Icon size={26} strokeWidth={1.2}/>{count > 0 && <span>{count} in order</span>}</div>
                      <span className="pos-dish-category">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p>
                    </button>
                    <div className="pos-dish-bottom"><strong>{formatKzt(item.price)}</strong><GlassButton className="pos-add-button subtle" aria-label={`Add one ${item.name}`} onClick={() => addItem(item)} disabled={isReserved}><Plus size={17}/></GlassButton></div>
                  </GlassCard>;
                })}
              </div>
              {!filteredMenu.length && <div className="tables-empty"><Search size={25}/><h3>No dishes found</h3><p>Try another search or category.</p><GlassButton onClick={() => { setSearch(''); setCategory('All'); }}>Reset menu filters</GlassButton></div>}
            </GlassPanel>

            <GlassPanel className="pos-current-order">
              <div className="card-heading"><div><h2>Current Order</h2><p>{selectedTable ? tableName(selectedTable.id) : 'No table selected'}</p></div><span className="pos-order-icon"><ShoppingBag size={19}/></span></div>
              <div className="pos-guests"><span>Guests <small>{selectedTable ? `${selectedTable.seats} seats` : 'Select a table'}</small></span><div className="pos-stepper"><button aria-label="Decrease guests" disabled={!draft || draft.guests <= 1 || isReserved} onClick={() => updateDraft({ guests: draft!.guests - 1 })}><Minus size={14}/></button><span>{draft?.guests ?? 0}</span><button aria-label="Increase guests" disabled={!draft || draft.guests >= selectedTable!.seats || isReserved} onClick={() => updateDraft({ guests: draft!.guests + 1 })}><Plus size={14}/></button></div></div>
              <div className="pos-order-lines">
                {!draft?.items.length && <div className="pos-order-empty"><UtensilsCrossed size={26} strokeWidth={1.2}/><strong>{isReserved ? 'Reserved for later' : 'Something delicious awaits'}</strong><p>{isReserved ? 'Choose an available or occupied table.' : 'Choose a table and add dishes from the menu.'}</p></div>}
                {draft?.items.map(item => <div className="pos-order-line" key={item.menuItemId}>
                  <div className="pos-line-heading"><h3>{item.name}</h3><button className="icon-button" aria-label={`Remove ${item.name}`} onClick={() => updateDraft({ items: draft.items.filter(line => line.menuItemId !== item.menuItemId) })}><Trash2 size={14}/></button></div>
                  <small>{formatKzt(item.price)} each</small>
                  <div className="pos-line-bottom"><div className="pos-stepper"><button aria-label={`Decrease ${item.name}`} onClick={() => quantity(item.menuItemId, -1)}><Minus size={13}/></button><span>{item.quantity}</span><button aria-label={`Increase ${item.name}`} onClick={() => quantity(item.menuItemId, 1)}><Plus size={13}/></button></div><strong>{formatKzt(item.price * item.quantity)}</strong></div>
                </div>)}
              </div>
              <label className="pos-notes">Order notes<textarea placeholder="Allergies, special requests..." value={draft?.notes ?? ''} disabled={!draft || isReserved} onChange={event => updateDraft({ notes: event.target.value })} maxLength={500}/></label>
              <dl className="pos-totals"><div><dt>Subtotal</dt><dd data-testid="order-subtotal">{formatKzt(totals.subtotal)}</dd></div><div><dt>Service charge <span>10%</span></dt><dd data-testid="order-service">{formatKzt(totals.service)}</dd></div><div className="pos-grand-total"><dt>Total</dt><dd data-testid="order-total">{formatKzt(totals.total)}</dd></div></dl>
              <div className="pos-order-actions"><GlassButton className="subtle" onClick={save} disabled={sending}><Save size={15}/>Save Order</GlassButton><GlassButton className="primary" onClick={send} disabled={sending} aria-busy={sending}><ChefHat size={16}/>{sending ? 'Sending…' : 'Send to Kitchen'}</GlassButton></div>
              <p className="pos-local-note">Mock service · no backend connected</p>
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  );
}

