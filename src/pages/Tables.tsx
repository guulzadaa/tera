import { useEffect, useRef, useState } from 'react';
import { Armchair, ArrowRight, Check, Clock3, LayoutGrid, Plus, Search, Users, UtensilsCrossed, X } from 'lucide-react';
import { Badge, GlassButton, GlassCard, GlassPanel } from '../components/ui';
import { type RestaurantTable } from '../data/mock';
import { useTables } from '../data/TableContext';
import { useMenu } from '../data/MenuContext';
import { useNavigate } from 'react-router-dom';

const statuses = ['All', 'Available', 'Occupied', 'Reserved'] as const;
const tones = { Available: 'green', Occupied: 'orange', Reserved: 'blue' } as const;
const tableName = (id: number) => `Table ${String(id).padStart(2, '0')}`;
const total = (table: RestaurantTable) => { const subtotal = table.items.reduce((sum, item) => sum + item.price * item.quantity, 0); return subtotal + Math.round(subtotal * .1); };
const money = (amount: number) => `₸${amount.toLocaleString('en-US')}`;
type ModalMode = 'details' | 'reservation' | 'order' | 'items';

export default function Tables() {
  const { tables, updateTable, storageAvailable } = useTables();
  const menu = useMenu();
  const navigate = useNavigate();
  const tableMenu = menu.items.filter(item => item.available).map(item => ({ ...item, quantity: 1 }));
  const [filter, setFilter] = useState<(typeof statuses)[number]>('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<ModalMode>('details');
  const [guestCount, setGuestCount] = useState(1);
  const [reservationTable, setReservationTable] = useState('');
  const [customer, setCustomer] = useState('');
  const [time, setTime] = useState('19:30');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = selectedId !== null || mode === 'reservation';
  const selected = tables.find(table => table.id === selectedId);
  const occupied = tables.filter(table => table.status === 'Occupied').length;
  const available = tables.filter(table => table.status === 'Available');
  const visibleTables = tables.filter(table =>
    (filter === 'All' || table.status === filter) &&
    (tableName(table.id).toLowerCase().includes(search.trim().toLowerCase()) || String(table.id) === search.trim())
  );

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialogRef.current?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  function closeModal() { setSelectedId(null); setMode('details'); }
  function inspect(table: RestaurantTable) {
    setSelectedId(table.id);
    setGuestCount(table.guests || 1);
    setMode('details');
  }
  function startOrder() {
    if (!selected) return;
    updateTable(selected.id, { status: 'Occupied', guests: guestCount, orderId: `#TR-${1060 + selected.id}`, duration: 0, items: [], customerName: undefined, reservationTime: undefined });
    setMessage(`${tableName(selected.id)} is seated. A new order is ready for items.`);
    closeModal(); navigate(`/orders?table=${selected.id}`);
  }
  function openReservation(table?: RestaurantTable) {
    setFormError('');
    setSelectedId(table?.id ?? null);
    setReservationTable(String(table?.id ?? available[0]?.id ?? ''));
    setCustomer(table?.customerName ?? '');
    setTime(table?.reservationTime ?? '19:30');
    setGuestCount(table?.guests ?? 2);
    setMode('reservation');
  }
  function saveReservation(event: React.FormEvent) {
    event.preventDefault();
    const target = tables.find(table => table.id === Number(reservationTable));
    if (!target || guestCount < 1 || guestCount > target.seats || !Number.isInteger(guestCount) || !customer.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setFormError('Enter a customer name, valid time and guest count within the table capacity.'); return; }
    if (selected && selected.status === 'Reserved' && selected.id !== target.id) {
      updateTable(selected.id, { status: 'Available', guests: 0, customerName: undefined, reservationTime: undefined });
    }
    updateTable(target.id, { status: 'Reserved', customerName: customer.trim(), reservationTime: time, guests: guestCount });
    setMessage(`Reservation saved for ${tableName(target.id)} at ${time}.`);
    closeModal();
  }
  const reservationOptions = tables.filter(table => table.status === 'Available' || (table.id === selectedId && table.status === 'Reserved'));
  const reservationSeats = tables.find(table => table.id === Number(reservationTable))?.seats ?? 1;

  return (
    <div className="tables-page">
      <div className="page-heading">
        <div><div className="eyebrow">A PLACE FOR EVERY GUEST</div><h1>Tables</h1><p>Manage restaurant floor and table availability.</p></div>
        <div className="heading-actions">
          <span className="table-occupancy"><span className="occupancy-dot"/>{occupied} / {tables.length} occupied <span>· {Math.round(occupied / tables.length * 100)}%</span></span>
          <GlassButton className="subtle" onClick={() => openReservation()} disabled={!available.length}><Plus size={16}/>New reservation</GlassButton>
        </div>
      </div>

      <div className="stats-grid table-summary">
        {(['Total Tables', 'Available', 'Occupied', 'Reserved'] as const).map((label, index) => (
          <GlassCard className="table-summary-card" key={label}>
            <div className="stat-top"><span>{label}</span><span className={`summary-icon summary-${index}`}>{index === 0 ? <LayoutGrid size={18}/> : <Armchair size={18}/>}</span></div>
            <strong>{index === 0 ? tables.length : tables.filter(table => table.status === label).length}</strong>
            <span className="summary-caption">{['Across the restaurant', 'Ready to welcome', 'Service in progress', 'Guests on their way'][index]}</span>
          </GlassCard>
        ))}
      </div>

      <div className="table-toolbar">
        <div className="table-filters" role="group" aria-label="Filter tables by status">
          {statuses.map(status => <GlassButton key={status} className={`table-filter ${filter === status ? 'is-selected' : ''}`} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status}<span>{status === 'All' ? tables.length : tables.filter(table => table.status === status).length}</span></GlassButton>)}
        </div>
        <label className="table-search"><Search size={16}/><input placeholder="Search table..." aria-label="Search table" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button className="icon-button" aria-label="Clear table search" onClick={() => setSearch('')}><X size={14}/></button>}</label>
      </div>

      <GlassPanel className="restaurant-floor">
        <div className="card-heading"><div><h2>Restaurant Floor</h2><p>Main dining room · {visibleTables.length} {visibleTables.length === 1 ? 'table' : 'tables'} shown</p></div><span className="floor-service"><span className="occupancy-dot"/>Service is live</span></div>
        <div className="restaurant-table-grid">
          {visibleTables.map(table => (
            <button key={table.id} className={`restaurant-table status-${table.status.toLowerCase()}`} onClick={() => inspect(table)} aria-label={`${tableName(table.id)}, ${table.status}, ${table.seats} seats`}>
              <div className="table-tile-top"><span>{table.seats} seats</span><Badge tone={tones[table.status]}><i/>{table.status}</Badge></div>
              <div className={`table-furniture seats-${table.seats}`} aria-hidden="true">
                {Array.from({length: table.seats}, (_, index) => <span key={index} className={`table-chair chair-${index}`}/>)}
                <div className="table-surface"><UtensilsCrossed size={18}/><strong>{String(table.id).padStart(2, '0')}</strong></div>
              </div>
              <h3>{tableName(table.id)}</h3>
              <div className="table-tile-details">
                {table.status === 'Occupied' ? <><span><Users size={13}/>{table.guests} / {table.seats} guests</span><strong>{money(total(table))}</strong></> : table.status === 'Reserved' ? <><span><Clock3 size={13}/>{table.reservationTime}</span><span>{table.guests} guests</span></> : <><span>Ready for guests</span><ArrowRight size={14}/></>}
              </div>
            </button>
          ))}
        </div>
        {!visibleTables.length && <div className="tables-empty"><Search size={26}/><h3>No tables found</h3><p>Try a different table number or status.</p><GlassButton onClick={() => { setSearch(''); setFilter('All'); }}>Reset filters</GlassButton></div>}
        <div className="floor-footnote"><span><Armchair size={14}/>Thoughtfully arranged. Ready for service.</span><span>{storageAvailable ? 'Shared floor · saved on this device' : 'Shared floor · session only'}</span></div>
      </GlassPanel>
      <div className="table-feedback" role="status" aria-live="polite">{message && <><Check size={15}/>{message}</>}</div>

      {open && <dialog ref={dialogRef} className="table-dialog glass-panel" aria-labelledby="table-dialog-title" onCancel={closeModal} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal(); } }}>
        <div className="table-dialog-heading"><div><span className="eyebrow">{mode === 'reservation' ? 'PLAN A WARM WELCOME' : 'MAIN DINING ROOM'}</span><h2 id="table-dialog-title">{mode === 'reservation' ? selected ? `Edit ${tableName(selected.id)} reservation` : 'New reservation' : tableName(selected!.id)}</h2></div><button autoFocus className="icon-button" aria-label="Close table details" onClick={closeModal}><X size={20}/></button></div>

        {mode === 'reservation' ? (
          <form className="table-form" noValidate onSubmit={saveReservation}>
            <label>Table<select value={reservationTable} onChange={event => { setReservationTable(event.target.value); const seats = tables.find(table => table.id === Number(event.target.value))!.seats; setGuestCount(Math.min(guestCount, seats)); }} required>{reservationOptions.map(table => <option key={table.id} value={table.id}>{tableName(table.id)} · {table.seats} seats</option>)}</select></label>
            <label>Customer name<input value={customer} onChange={event => setCustomer(event.target.value)} required maxLength={80} placeholder="Guest's full name"/></label>
            <div className="table-form-row"><label>Reservation time<input type="time" value={time} onInput={event => setTime(event.currentTarget.value)} required/></label><label>Guest count<input type="number" min={1} max={reservationSeats} value={guestCount} onChange={event => setGuestCount(Number(event.target.value))} required/></label></div>
            <p className="table-form-note">Today’s service · up to {reservationSeats} guests. Reservations are saved on this device.</p>
            {formError && <p role="alert" className="inventory-form-error">{formError}</p>}
            <GlassButton type="submit" className="primary">Save reservation<Check size={16}/></GlassButton>
          </form>
        ) : selected && (
          <>
            <div className="table-detail-status"><Badge tone={tones[selected.status]}><i/>{selected.status}</Badge><span><Armchair size={14}/>{selected.seats} seats</span></div>
            {selected.status === 'Available' ? <><p className="table-detail-copy">A fresh table, ready for your next guests. Start an order to begin service.</p><label className="table-guest-control">Guest count<select value={guestCount} onChange={event => setGuestCount(Number(event.target.value))}>{Array.from({length: selected.seats}, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? 'guest' : 'guests'}</option>)}</select></label><GlassButton className="primary" onClick={startOrder}><Plus size={16}/>Start new order</GlassButton></> : selected.status === 'Reserved' ? <><dl className="table-detail-list"><div><dt>Customer name</dt><dd>{selected.customerName}</dd></div><div><dt>Reservation time</dt><dd>{selected.reservationTime}</dd></div><div><dt>Guest count</dt><dd>{selected.guests} guests</dd></div></dl><div className="table-dialog-actions"><GlassButton className="primary" onClick={startOrder}><Users size={16}/>Seat guests</GlassButton><GlassButton className="subtle" onClick={() => openReservation(selected)}>Edit reservation</GlassButton></div></> : <>
              <dl className="table-detail-list"><div><dt>Guests</dt><dd>{selected.guests} / {selected.seats}</dd></div><div><dt>Current order</dt><dd>{selected.orderId}</dd></div><div><dt>Order duration</dt><dd>{selected.duration} min</dd></div><div><dt>Order total</dt><dd className="table-order-total">{money(total(selected))}</dd></div></dl>
              {mode === 'order' && <div className="table-order-items"><h3>Current order</h3>{selected.items.length ? selected.items.map(item => <div key={item.name}><span>{item.quantity} × {item.name}</span><strong>{money(item.price * item.quantity)}</strong></div>) : <p>No items yet. Add a dish to begin.</p>}</div>}
              {mode === 'items' && <div className="table-order-items"><h3>Add to this order</h3>{tableMenu.map(item => <div key={item.name}><span>{item.name}<small>{money(item.price)}</small></span><GlassButton className="subtle" aria-label={`Add ${item.name}`} onClick={() => { const existing = selected.items.find(entry => entry.name === item.name); updateTable(selected.id, { items: existing ? selected.items.map(entry => entry.name === item.name ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...selected.items, { ...item }] }); setMessage(`${item.name} added to ${tableName(selected.id)}.`); }}><Plus size={15}/>Add</GlassButton></div>)}</div>}
              <div className="table-dialog-actions">{selected.orderId === 'Draft' && !selected.items.length && <GlassButton className="subtle" onClick={() => { updateTable(selected.id, { status: 'Available' }); setMessage(`${tableName(selected.id)} released.`); closeModal(); }}>Release table</GlassButton>}<GlassButton className={mode === 'order' ? 'primary' : 'subtle'} onClick={() => setMode('order')}>View order</GlassButton><GlassButton className={mode === 'items' ? 'primary' : 'subtle'} onClick={() => setMode('items')}><Plus size={16}/>Add items</GlassButton></div>
            </>}
          </>
        )}
      </dialog>}
    </div>
  );
}
