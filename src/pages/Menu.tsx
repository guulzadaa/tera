import { useEffect, useRef, useState } from 'react';
import { CakeSlice, Check, CheckCircle2, Coffee, Leaf, MoreHorizontal, Pencil, Plus, Search, Soup, Trash2, UtensilsCrossed, X, XCircle } from 'lucide-react';
import { Badge, GlassButton, GlassCard } from '../components/ui';
import { useMenu } from '../data/MenuContext';
import { formatKzt, menuCategories, type MenuCategory } from '../data/orderModel';
import type { ManagedMenuItem } from '../data/menuModel';

const icons = { Starters: Soup, Salads: Leaf, 'Main Courses': UtensilsCrossed, Pasta: UtensilsCrossed, Desserts: CakeSlice, Drinks: Coffee };
export default function Menu() {
  const store = useMenu();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof menuCategories)[number]>('All');
  const [availability, setAvailability] = useState('All');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<ManagedMenuItem | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formCategory, setFormCategory] = useState<MenuCategory>('Starters');
  const [price, setPrice] = useState('');
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialogRef.current?.showModal(); document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, [modal]);
  useEffect(() => {
    if (!actionId) return;
    const close = (event: PointerEvent) => { if (!actionRef.current?.contains(event.target as Node) && !(event.target as Element).closest?.('.menu-action-trigger')) setActionId(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setActionId(null); document.getElementById(`menu-actions-${actionId}`)?.focus(); } };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    actionRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [actionId]);
  function open(kind: 'add' | 'edit' | 'delete', item?: ManagedMenuItem) {
    setSelected(item ?? null); setName(item?.name ?? ''); setDescription(item?.description ?? ''); setFormCategory(item?.category ?? 'Starters'); setPrice(item ? String(item.price) : ''); setAvailable(item?.available ?? true); setError(''); setActionId(null); setModal(kind);
  }
  const filtered = store.items.filter(item => (category === 'All' || item.category === category) && (availability === 'All' || item.available === (availability === 'Available')) && `${item.name} ${item.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  const counts = [store.items.length, store.items.filter(item => item.available).length, store.items.filter(item => !item.available).length, new Set(store.items.map(item => item.category)).size];
  return <div className="menu-management-page">
    <div className="page-heading"><div><div className="eyebrow">CRAFTED WITH CARE. MANAGED WITH EASE.</div><h1>Menu</h1><p>Manage dishes, pricing and availability.</p></div><GlassButton className="primary" onClick={() => open('add')}><Plus size={17}/>Add Menu Item</GlassButton></div>
    <div className="stats-grid menu-summary">{['Total Items', 'Available', 'Unavailable', 'Categories'].map((label, i) => <GlassCard className="stat" key={label}><div className="stat-top"><span>{label}</span><span className="stat-icon">{i === 1 ? <CheckCircle2 size={18}/> : i === 2 ? <XCircle size={18}/> : <UtensilsCrossed size={18}/>}</span></div><strong>{counts[i]}</strong><small>{['Across your restaurant', 'Ready for service', 'Hidden from POS selection', 'Represented on the menu'][i]}</small></GlassCard>)}</div>
    {notice && <div className="menu-notice" role="status"><Check size={16}/><span>{notice}</span><button className="icon-button" aria-label="Dismiss menu notification" onClick={() => setNotice('')}><X size={15}/></button></div>}
    {!store.storageAvailable && <p className="menu-storage-note" role="status">Changes are available for this session. Device storage is unavailable.</p>}
    <div className="menu-management-toolbar"><label className="table-search"><Search size={16}/><input placeholder="Search menu..." aria-label="Search menu" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button className="icon-button" aria-label="Clear menu search" onClick={() => setSearch('')}><X size={14}/></button>}</label><label className="menu-availability-filter">Availability<select aria-label="Menu availability" value={availability} onChange={event => setAvailability(event.target.value)}>{['All', 'Available', 'Unavailable'].map(value => <option key={value}>{value}</option>)}</select></label></div>
    <div className="table-filters menu-management-filters" aria-label="Menu categories">{menuCategories.map(value => <GlassButton key={value} className={`table-filter ${category === value ? 'is-selected' : ''}`} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</GlassButton>)}</div>
    <div className="menu-grid-heading"><h2>The collection</h2><span>{filtered.length} of {store.items.length} dishes</span></div>
    <div className="menu-management-grid">{filtered.map(item => { const Icon = icons[item.category]; return <GlassCard key={item.id} className={`managed-menu-card ${item.available ? '' : 'menu-unavailable'}`}><div className="managed-menu-top"><span className="managed-menu-art"><Icon size={31} strokeWidth={1.1}/></span><div className="menu-action-wrap"><button id={`menu-actions-${item.id}`} className="icon-button menu-action-trigger" aria-label={`Actions for ${item.name}`} aria-haspopup="menu" aria-expanded={actionId === item.id} onClick={() => setActionId(actionId === item.id ? null : item.id)}><MoreHorizontal size={19}/></button>{actionId === item.id && <div className="managed-menu-actions glass-panel" role="menu" aria-label={`${item.name} actions`} ref={actionRef}><button role="menuitem" onClick={() => open('edit', item)}><Pencil size={14}/>Edit</button><button role="menuitem" onClick={() => { store.setAvailability(item.id, !item.available); setActionId(null); setNotice(`${item.name} marked ${item.available ? 'unavailable' : 'available'}.`); }}><CheckCircle2 size={14}/>{item.available ? 'Mark Unavailable' : 'Mark Available'}</button><button role="menuitem" onClick={() => open('delete', item)}><Trash2 size={14}/>Delete</button></div>}</div></div><span className="managed-menu-category">{item.category}</span><h3>{item.name}</h3><p>{item.description || 'No description yet.'}</p><div className="managed-menu-bottom"><strong>{formatKzt(item.price)}</strong><Badge tone={item.available ? 'green' : 'neutral'}><i/>{item.available ? 'Available' : 'Unavailable'}</Badge></div><GlassButton className="subtle managed-menu-edit" aria-label={`Edit ${item.name}`} onClick={() => open('edit', item)}><Pencil size={13}/>Edit</GlassButton></GlassCard>; })}</div>
    {!filtered.length && <GlassCard className="tables-empty menu-empty"><Search size={24}/><h3>No dishes found</h3><p>Try another search or filter.</p><GlassButton onClick={() => { setSearch(''); setCategory('All'); setAvailability('All'); }}>Reset filters</GlassButton></GlassCard>}
    <p className="menu-storage-note">Menu changes sync with Orders & POS and save on this device. Existing order names and prices stay preserved.</p>
    {modal && <dialog className="table-dialog glass-panel menu-item-dialog" ref={dialogRef} aria-labelledby="menu-dialog-title" onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setModal(null); } }}><div className="table-dialog-heading"><div><span className="eyebrow">YOUR MENU, REFINED</span><h2 id="menu-dialog-title">{modal === 'delete' ? `Delete “${selected?.name}”?` : modal === 'edit' ? 'Edit Menu Item' : 'Add Menu Item'}</h2></div><button className="icon-button" aria-label="Close menu dialog" onClick={() => setModal(null)}><X size={19}/></button></div>
      {modal === 'delete' ? <><p className="table-detail-copy">This item will be removed from the active menu and future POS selection. Historical orders keep their saved name and price.</p><div className="menu-dialog-footer"><GlassButton autoFocus onClick={() => setModal(null)}>Cancel</GlassButton><GlassButton className="danger" onClick={() => { if (selected) { store.deleteItem(selected.id); setNotice(`${selected.name} removed from the active menu.`); } setModal(null); }}>Delete</GlassButton></div></> : <form className="table-form" noValidate onSubmit={event => { event.preventDefault(); if (!name.trim()) { setError('Dish name is required.'); return; } if (!Number.isSafeInteger(Number(price)) || Number(price) <= 0) { setError('Enter a positive whole KZT price.'); return; } if (!store.saveItem({ name, description, category: formCategory, price: Number(price), available }, modal === 'edit' ? selected?.id : undefined)) { setError('Check the dish details and try again.'); return; } setNotice(`${name.trim()} ${modal === 'edit' ? 'updated' : 'added to the menu'}.`); setModal(null); }}><label>Dish Name<input autoFocus value={name} maxLength={100} required onChange={event => setName(event.target.value)} /></label><label>Description<textarea value={description} maxLength={400} rows={3} onChange={event => setDescription(event.target.value)} /></label><div className="table-form-row"><label>Category<select aria-label="Category" value={formCategory} onChange={event => setFormCategory(event.target.value as MenuCategory)}>{menuCategories.filter(value => value !== 'All').map(value => <option key={value}>{value}</option>)}</select></label><label>Price (KZT)<input type="number" min="1" step="1" value={price} required onChange={event => setPrice(event.target.value)} /></label></div><label>Availability<select aria-label="Availability" value={available ? 'Available' : 'Unavailable'} onChange={event => setAvailable(event.target.value === 'Available')}><option>Available</option><option>Unavailable</option></select></label>{error && <p role="alert" className="menu-form-error">{error}</p>}<div className="menu-dialog-footer"><GlassButton type="button" onClick={() => setModal(null)}>Cancel</GlassButton><GlassButton type="submit" className="primary">{modal === 'edit' ? 'Save Changes' : 'Add Item'}</GlassButton></div></form>}
    </dialog>}
  </div>;
}
