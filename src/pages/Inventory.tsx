import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowDownUp, Check, Clock3, History, Leaf, MoreHorizontal, Package, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge, GlassButton, GlassCard, GlassPanel } from '../components/ui';
import { useInventory } from '../data/InventoryContext';
import { inventoryCategories, stockQuantity, stockReasons, stockTimestamp, type InventoryItem, type StockReason, type StockStatus } from '../data/inventoryModel';

const statuses = ['All', 'Healthy', 'Low Stock', 'Critical'] as const;
const tones = { Healthy: 'green', 'Low Stock': 'orange', Critical: 'orange' } as const;
const priority: Record<StockStatus, number> = { Critical: 0, 'Low Stock': 1, Healthy: 2 };
type ModalMode = 'add' | 'adjust' | 'history';

export default function Inventory() {
  const store = useInventory();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof statuses)[number]>('All');
  const [category, setCategory] = useState('All Categories');
  const [sort, setSort] = useState('Name');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [ingredientId, setIngredientId] = useState(store.items[0].id);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<StockReason>('Manual correction');
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [menuItem, setMenuItem] = useState<InventoryItem | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const modalOpen = modal !== null;
  const ingredient = store.items.find(item => item.id === ingredientId)!;
  const filtered = store.items.filter(item => (filter === 'All' || item.status === filter) && (category === 'All Categories' || item.category === category) && item.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => sort === 'Stock Level' ? a.currentStock / a.minimumStock - b.currentStock / b.minimumStock || a.name.localeCompare(b.name) : sort === 'Status' ? priority[a.status] - priority[b.status] || a.name.localeCompare(b.name) : sort === 'Recently Updated' ? Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  const attention = store.items.filter(item => item.status !== 'Healthy').sort((a, b) => priority[a.status] - priority[b.status] || a.currentStock / a.minimumStock - b.currentStock / b.minimumStock).slice(0, 5);

  useEffect(() => {
    if (!modal) return;
    const focus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialogRef.current?.close(); document.body.style.overflow = overflow; focus?.focus(); };
  }, [modalOpen]);
  useEffect(() => {
    if (!menuItem) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    menuRef.current?.querySelector('button')?.focus();
    const close = () => setMenuItem(null);
    const outside = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); previousFocus?.focus(); };
  }, [menuItem]);
  function openModal(mode: ModalMode, item = store.items[0]) {
    setIngredientId(item.id); setQuantity(mode === 'adjust' ? String(item.currentStock) : ''); setReason('Manual correction'); setFormError(''); setModal(mode); setMenuItem(null);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(quantity);
    if (!quantity.trim() || !store.changeStock(ingredientId, value, modal === 'add' ? 'Stock delivery' : reason, modal === 'add' ? 'add' : 'set')) {
      setFormError('Enter a valid quantity. Bottles and pieces must be whole numbers.'); return;
    }
    setNotice(modal === 'add' ? `${stockQuantity(value)} ${ingredient.unit} added to ${ingredient.name}` : `${ingredient.name} adjusted to ${stockQuantity(value)} ${ingredient.unit}`);
    setModal(null);
  }

  return (
    <div className="inventory-page">
      <div className="page-heading"><div><div className="eyebrow">EVERY INGREDIENT, IN BALANCE</div><h1>Inventory</h1><p>Monitor stock levels and ingredient availability.</p></div><GlassButton className="primary" onClick={() => openModal('add')}><Plus size={17}/>Add Stock</GlassButton></div>
      <div className="stats-grid inventory-summary">
        {(['Total Ingredients', 'Healthy Stock', 'Low Stock', 'Critical'] as const).map((label, index) => <GlassCard className={`inventory-summary-card inventory-summary-${index}`} key={label}><div className="stat-top"><span>{label}</span>{index === 0 ? <Package size={18}/> : index === 1 ? <Leaf size={18}/> : <AlertTriangle size={18}/>}</div><strong>{index === 0 ? store.items.length : store.items.filter(item => item.status === (index === 1 ? 'Healthy' : label)).length}</strong><small>{['Tracked in your kitchen', 'Ready for service', 'Time to replenish', 'Prioritize restocking'][index]}</small></GlassCard>)}
      </div>
      {notice && <div className="pos-notice inventory-notice" role="status"><span className="pos-notice-icon"><Check size={18}/></span><div><strong>Inventory updated</strong><p>{notice}</p></div><button className="icon-button" aria-label="Dismiss inventory notification" onClick={() => setNotice('')}><X size={16}/></button></div>}
      <div className="inventory-toolbar"><div className="table-filters" role="group" aria-label="Stock status filters">{statuses.map(status => <GlassButton className={`table-filter ${filter === status ? 'is-selected' : ''}`} key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status}</GlassButton>)}</div><label className="table-search inventory-search"><Search size={16}/><input placeholder="Search inventory..." aria-label="Search inventory" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button className="icon-button" aria-label="Clear inventory search" onClick={() => setSearch('')}><X size={14}/></button>}</label></div>

      <GlassPanel className="inventory-panel">
        <div className="inventory-panel-heading"><div><h2>Ingredient stock</h2><p>{filtered.length} of {store.items.length} ingredients · kept fresh, kept in view</p></div><div className="inventory-dropdowns"><label><SlidersHorizontal size={14}/><select aria-label="Inventory category" value={category} onChange={event => setCategory(event.target.value)}><option>All Categories</option>{inventoryCategories.map(name => <option key={name}>{name}</option>)}</select></label><label><ArrowDownUp size={14}/><select aria-label="Sort inventory" value={sort} onChange={event => setSort(event.target.value)}>{['Name', 'Stock Level', 'Status', 'Recently Updated'].map(name => <option key={name}>{name}</option>)}</select></label></div></div>
        <div className="inventory-table-scroll"><table className="inventory-table"><thead><tr>{['Ingredient', 'Category', 'Current Stock', 'Minimum Stock', 'Status', 'Last Updated', 'Actions'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>
          {filtered.map(item => <tr key={item.id} className={`inventory-row inventory-${item.status.toLowerCase().replace(' ', '-')}`}>
            <td data-label="Ingredient"><div className="inventory-ingredient"><span className="inventory-ingredient-icon"><Package size={16} strokeWidth={1.5}/></span><strong>{item.name}</strong></div></td><td data-label="Category">{item.category}</td>
            <td data-label="Current Stock"><span className="inventory-quantity">{stockQuantity(item.currentStock)} <small>{item.unit}</small></span><span className="inventory-level" role="meter" aria-label={`${item.name} stock relative to minimum`} aria-valuemin={0} aria-valuemax={item.minimumStock} aria-valuenow={Math.min(item.currentStock, item.minimumStock)} aria-valuetext={`${item.currentStock} of minimum ${item.minimumStock} ${item.unit}`}><i style={{ width: `${Math.min(100, item.currentStock / item.minimumStock * 100)}%` }}/></span></td>
            <td data-label="Minimum Stock">{stockQuantity(item.minimumStock)} {item.unit}</td><td data-label="Status"><Badge tone={tones[item.status]}><i/>{item.status}</Badge></td><td data-label="Last Updated"><time dateTime={item.lastUpdated}>{stockTimestamp(item.lastUpdated)}</time></td>
            <td data-label="Actions"><button className="icon-button" aria-label={`Actions for ${item.name}`} aria-haspopup="menu" aria-expanded={menuItem?.id === item.id} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setMenuPosition({ top: Math.min(rect.bottom + 5, window.innerHeight - 110), left: Math.max(12, Math.min(rect.right - 180, window.innerWidth - 192)) }); setMenuItem(menuItem?.id === item.id ? null : item); }}><MoreHorizontal size={19}/></button></td>
          </tr>)}
        </tbody></table></div>
        {!filtered.length && <div className="tables-empty"><Search size={25}/><h3>No ingredients found</h3><p>Try another search, status, or category.</p><GlassButton onClick={() => { setSearch(''); setFilter('All'); setCategory('All Categories'); }}>Reset inventory filters</GlassButton></div>}
        <p className="inventory-threshold-note">Healthy: at least 120% of minimum · Low Stock: above 62.5% and below 120% · Critical: 62.5% or less</p>
      </GlassPanel>

      <div className="inventory-bottom-grid"><GlassPanel className="inventory-attention"><div className="card-heading"><div><h2>Needs Attention</h2><p>A little foresight keeps service flowing.</p></div><AlertTriangle size={18}/></div>{attention.length ? attention.map(item => <div className="inventory-attention-row" key={item.id}><div><strong>{item.name}</strong><small>{stockQuantity(item.currentStock)} {item.unit} remaining</small></div><Badge tone={tones[item.status]}>{item.status}</Badge><GlassButton className="subtle" aria-label={`Add stock to ${item.name}`} onClick={() => openModal('add', item)}><Plus size={13}/>Add Stock</GlassButton></div>) : <div className="tables-empty"><Check size={24}/><h3>Everything is well stocked</h3></div>}</GlassPanel>
        <GlassPanel className="inventory-activity"><div className="card-heading"><div><h2>Recent Activity</h2><p>A clear record of every stock change.</p></div><History size={18}/></div>{store.activity.slice(0, 6).map(entry => <div className="inventory-activity-row" key={entry.id}><span className={`inventory-activity-sign ${entry.delta < 0 ? 'negative' : ''}`}>{entry.delta < 0 ? '−' : '+'}</span><div><strong>{entry.delta >= 0 ? '+' : '−'}{stockQuantity(Math.abs(entry.delta))} {entry.unit} {entry.ingredientName}</strong><small>{entry.reason} · {stockTimestamp(entry.timestamp)}</small></div></div>)}</GlassPanel></div>
      <p className="inventory-persistence">{store.storageAvailable ? 'Inventory and activity saved on this device' : 'Local storage unavailable · changes kept for this session'}</p>

      {menuItem && <div className="inventory-action-menu glass-panel" role="menu" aria-label={`${menuItem.name} actions`} ref={menuRef} style={menuPosition}><button role="menuitem" onClick={() => openModal('adjust', menuItem)}><SlidersHorizontal size={15}/>Adjust Stock</button><button role="menuitem" onClick={() => openModal('history', menuItem)}><History size={15}/>View History</button></div>}
      {modal && <dialog ref={dialogRef} className="table-dialog glass-panel inventory-dialog" aria-labelledby="inventory-dialog-title" onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setModal(null); } }}>
        <div className="table-dialog-heading"><div><span className="eyebrow">A WELL-STOCKED KITCHEN</span><h2 id="inventory-dialog-title">{modal === 'add' ? 'Add Stock' : modal === 'adjust' ? 'Adjust Stock' : `${ingredient.name} History`}</h2></div><button autoFocus className="icon-button" aria-label="Close inventory dialog" onClick={() => setModal(null)}><X size={20}/></button></div>
        {modal === 'history' ? <div className="inventory-history"><p className="table-detail-copy">Current stock: {stockQuantity(ingredient.currentStock)} {ingredient.unit}</p>{store.activity.filter(entry => entry.ingredientId === ingredientId).length ? store.activity.filter(entry => entry.ingredientId === ingredientId).map(entry => <div className="inventory-history-entry" key={entry.id}><strong>{entry.delta >= 0 ? '+' : '−'}{stockQuantity(Math.abs(entry.delta))} {entry.unit} · {entry.reason}</strong><p>{stockQuantity(entry.previousStock)} → {stockQuantity(entry.newStock)} {entry.unit}</p><small><Clock3 size={12}/>{stockTimestamp(entry.timestamp)}</small></div>) : <div className="tables-empty"><History size={25}/><h3>No stock changes yet</h3><p>Future adjustments will appear here.</p></div>}</div> : <form className="table-form" noValidate onSubmit={submit}>
          {modal === 'add' ? <label>Ingredient<select value={ingredientId} onChange={event => { setIngredientId(event.target.value); setQuantity(''); setFormError(''); }}>{[...store.items].sort((a, b) => a.name.localeCompare(b.name)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <div className="inventory-current"><strong>{ingredient.name}</strong><p>Current quantity: {stockQuantity(ingredient.currentStock)} {ingredient.unit}</p></div>}
          <div className="table-form-row"><label>{modal === 'add' ? 'Quantity' : 'New quantity'}<input type="number" aria-label={modal === 'add' ? 'Stock quantity' : 'New stock quantity'} min={modal === 'add' ? (ingredient.unit === 'bottles' || ingredient.unit === 'pieces' ? 1 : 0.01) : 0} step={ingredient.unit === 'bottles' || ingredient.unit === 'pieces' ? 1 : 0.01} value={quantity} onChange={event => setQuantity(event.target.value)} required/></label><label>Unit<input value={ingredient.unit} readOnly aria-label="Stock unit"/></label></div>
          {modal === 'adjust' && <label>Reason<select value={reason} onChange={event => setReason(event.target.value as StockReason)}>{stockReasons.map(name => <option key={name}>{name}</option>)}</select></label>}
          <p className="table-form-note">{modal === 'add' ? `Current stock: ${stockQuantity(ingredient.currentStock)} ${ingredient.unit}. Incoming stock is recorded as a delivery.` : 'Enter the final quantity on hand. Every change is recorded in ingredient history.'}</p>
          {formError && <p role="alert" className="inventory-form-error">{formError}</p>}
          <GlassButton type="submit" className="primary"><Check size={16}/>{modal === 'add' ? 'Add to Inventory' : 'Save Adjustment'}</GlassButton>
        </form>}
      </dialog>}
    </div>
  );
}
