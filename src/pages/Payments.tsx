import { useEffect, useRef, useState } from 'react';
import { Armchair, Banknote, Check, Clock3, CreditCard, MoreHorizontal, QrCode, Receipt, Search, Users, X } from 'lucide-react';
import { Badge, GlassButton, GlassCard, GlassPanel } from '../components/ui';
import { usePayments } from '../data/PaymentContext';
import { formatKzt, orderTotals } from '../data/orderModel';
import { paymentDay, paymentMethods, paymentTimestamp, splitPayment, type PaymentMethod, type PaymentTransaction } from '../data/paymentModel';

const methodIcons = { Cash: Banknote, Card: CreditCard, QR: QrCode };
const tableName = (id: number) => `Table ${String(id).padStart(2, '0')}`;
type Modal = 'bill' | 'receipt' | 'refund';

export default function Payments() {
  const store = usePayments();
  const [view, setView] = useState<'pending' | 'history'>('pending');
  const [modal, setModal] = useState<Modal | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [received, setReceived] = useState('');
  const [split, setSplit] = useState(false);
  const [people, setPeople] = useState(2);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('All Methods');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [justPaid, setJustPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const paymentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (paymentTimer.current) clearTimeout(paymentTimer.current); }, []);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const modalOpen = modal !== null;
  const bill = store.pendingBills.find(order => order.id === orderId);
  const receipt = store.transactions.find(transaction => transaction.id === receiptId);
  const totals = orderTotals(bill?.items ?? []);
  const today = paymentDay(new Date().toISOString());
  const todaysPaid = store.transactions.filter(transaction => paymentDay(transaction.paidAt) === today && transaction.status === 'Paid');
  const revenue = todaysPaid.reduce((sum, transaction) => sum + transaction.total, 0);
  const change = received.trim() && Number.isFinite(Number(received)) ? Number(received) - totals.total : null;
  const shares = splitPayment(totals.total, split ? people : 1);
  const filteredHistory = store.transactions.filter(transaction => (methodFilter === 'All Methods' || transaction.method === methodFilter) && (statusFilter === 'All Statuses' || transaction.status === statusFilter) && `${transaction.id} #${transaction.orderId} ${tableName(transaction.tableId)}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => Date.parse(b.paidAt) - Date.parse(a.paidAt));

  useEffect(() => {
    if (!modalOpen) return;
    const focus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialogRef.current?.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialogRef.current?.close(); document.body.style.overflow = overflow; focus?.focus(); };
  }, [modalOpen]);
  useEffect(() => {
    if (!menuId) return;
    const focus = document.activeElement as HTMLElement | null;
    menuRef.current?.querySelector('button')?.focus();
    const close = () => setMenuId(null);
    const outside = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', escape); window.addEventListener('scroll', close, true); window.addEventListener('resize', close);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); focus?.focus(); };
  }, [menuId]);
  function closePayment() { if (paymentTimer.current) clearTimeout(paymentTimer.current); paymentTimer.current = null; setProcessing(false); setModal(null); }
  function openBill(id: number) { setOrderId(id); setMethod(null); setReceived(''); setSplit(false); setPeople(2); setError(''); setJustPaid(false); setModal('bill'); }
  function openReceipt(transaction: PaymentTransaction) { setReceiptId(transaction.id); setJustPaid(false); setMenuId(null); setModal('receipt'); }
  function complete() {
    if (processing) return;
    if (!method) { setError('Choose a payment method.'); return; }
    if (method === 'Cash' && (!received.trim() || !Number.isSafeInteger(Number(received)) || Number(received) < totals.total)) { setError('Amount received must cover the full bill in whole tenge.'); return; }
    setProcessing(true);
    paymentTimer.current = setTimeout(() => {
    setProcessing(false); paymentTimer.current = null;
    const transaction = orderId === null ? null : store.completePayment(orderId, method, method === 'Cash' ? Number(received) : undefined, split ? people : 1);
    if (!transaction) { setError('This bill is no longer available for payment.'); return; }
    setReceiptId(transaction.id); setJustPaid(true); setError(''); setModal('receipt'); setNotice('Payment successful');
    }, 350);
  }

  return (
    <div className="payments-page">
      <div className="page-heading"><div><div className="eyebrow">A SEAMLESS END TO GREAT SERVICE</div><h1>Payments</h1><p>Manage bills and restaurant transactions.</p></div><div className="payment-header-metrics"><div><span>Today's Revenue</span><strong>{formatKzt(revenue)}</strong></div><div><span>Completed today</span><strong>{todaysPaid.length}</strong></div><div><span>Pending</span><strong>{store.pendingBills.length}</strong></div></div></div>
      <div className="pos-segments" role="group" aria-label="Payment views"><GlassButton className={view === 'pending' ? 'is-selected' : ''} aria-pressed={view === 'pending'} onClick={() => setView('pending')}><Receipt size={15}/>Pending Bills<span>{store.pendingBills.length}</span></GlassButton><GlassButton className={view === 'history' ? 'is-selected' : ''} aria-pressed={view === 'history'} onClick={() => setView('history')}><Clock3 size={15}/>Payment History</GlassButton></div>
      {notice && <div className="pos-notice" role="status"><span className="pos-notice-icon"><Check size={18}/></span><div><strong>{notice}</strong><p>Recorded locally for this prototype.</p></div><button className="icon-button" aria-label="Dismiss payment notification" onClick={() => setNotice('')}><X size={16}/></button></div>}
      {view === 'pending' ? <>
        <div className="payment-section-heading"><h2>Ready to settle</h2><span>Ready and served orders · 10% service included</span></div>
        <div className="payment-bill-grid">{store.pendingBills.map(order => {
          const amount = orderTotals(order.items);
          return <GlassCard className="payment-bill-card" key={order.id}><div className="card-heading"><h3>#{order.id}</h3><Badge tone="orange">Awaiting Payment</Badge></div><div className="payment-bill-table"><Armchair size={16}/><strong>{tableName(order.tableId)}</strong><span>{order.guests} {order.guests === 1 ? 'guest' : 'guests'}</span></div><div className="payment-bill-meta"><span><Clock3 size={12}/>{paymentTimestamp(order.createdAt)}</span><span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span></div><dl><div><dt>Subtotal</dt><dd>{formatKzt(amount.subtotal)}</dd></div><div><dt>Total</dt><dd>{formatKzt(amount.total)}</dd></div></dl><GlassButton className="subtle" aria-label={`Open bill ${order.id}`} onClick={() => openBill(order.id)}>Open Bill<Receipt size={15}/></GlassButton></GlassCard>;
        })}</div>
        {!store.pendingBills.length && <GlassPanel className="tables-empty payment-empty"><Receipt size={29}/><h3>All bills are settled</h3><p>Ready and served orders from your kitchen will appear here.</p></GlassPanel>}
      </> : <GlassPanel className="payment-history-panel"><div className="inventory-panel-heading"><div><h2>Payment History</h2><p>{filteredHistory.length} transactions · a clear record of every bill</p></div><label className="table-search"><Search size={16}/><input placeholder="Search transaction..." aria-label="Search transaction" value={search} onChange={event => setSearch(event.target.value)}/></label></div><div className="payment-history-filters"><label>Method<select aria-label="Payment method filter" value={methodFilter} onChange={event => setMethodFilter(event.target.value)}>{['All Methods', ...paymentMethods].map(name => <option key={name}>{name}</option>)}</select></label><label>Status<select aria-label="Payment status filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>{['All Statuses', 'Paid', 'Refunded'].map(name => <option key={name}>{name}</option>)}</select></label></div><div className="table-scroll"><table className="payment-history-table"><thead><tr>{['Transaction', 'Order', 'Table', 'Date & Time', 'Payment Method', 'Amount', 'Status', 'Actions'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{filteredHistory.map(transaction => <tr key={transaction.id}><td><strong>{transaction.id}</strong></td><td>#{transaction.orderId}</td><td>{tableName(transaction.tableId)}</td><td>{paymentTimestamp(transaction.paidAt)}</td><td>{transaction.method}</td><td>{formatKzt(transaction.total)}</td><td><Badge tone={transaction.status === 'Paid' ? 'green' : 'neutral'}>{transaction.status}</Badge></td><td><button className="icon-button" aria-label={`Actions for ${transaction.id}`} aria-haspopup="menu" aria-expanded={menuId === transaction.id} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setMenuPosition({ top: Math.min(rect.bottom + 5, window.innerHeight - 115), left: Math.max(12, Math.min(rect.right - 190, window.innerWidth - 202)) }); setMenuId(menuId === transaction.id ? null : transaction.id); }}><MoreHorizontal size={19}/></button></td></tr>)}</tbody></table></div>{!filteredHistory.length && <div className="tables-empty"><Search size={25}/><h3>No transactions found</h3><p>Try a different search or filter.</p><GlassButton onClick={() => { setSearch(''); setMethodFilter('All Methods'); setStatusFilter('All Statuses'); }}>Reset payment filters</GlassButton></div>}</GlassPanel>}
      <p className="payment-local-note">Simulated payments only · {store.storageAvailable ? 'transactions saved on this device' : 'storage unavailable; transactions kept for this session'}</p>
      {menuId && <div ref={menuRef} className="inventory-action-menu payment-action-menu glass-panel" role="menu" style={menuPosition}><button role="menuitem" onClick={() => openReceipt(store.transactions.find(transaction => transaction.id === menuId)!)}><Receipt size={15}/>View Receipt</button>{store.transactions.find(transaction => transaction.id === menuId)?.status === 'Paid' && <button role="menuitem" onClick={() => { setReceiptId(menuId); setMenuId(null); setModal('refund'); }}>Mark as Refunded</button>}</div>}
      {modal && <dialog ref={dialogRef} className="table-dialog glass-panel payment-dialog" aria-labelledby="payment-dialog-title" onCancel={() => closePayment()} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePayment(); } }}>
        <div className="table-dialog-heading"><div><span className="eyebrow">THE OAK & EMBER · TERA</span><h2 id="payment-dialog-title">{modal === 'bill' ? tableName(bill?.tableId ?? 0) : modal === 'refund' ? 'Simulate refund' : justPaid ? 'Payment successful' : 'Digital receipt'}</h2>{modal === 'bill' && <p className="payment-order-id">Order #{bill?.id}</p>}</div><button autoFocus className="icon-button" aria-label="Close payment dialog" onClick={() => closePayment()}><X size={20}/></button></div>
        {modal === 'bill' && bill && <>
          <div className="payment-bill-lines">{bill.items.map(item => <div key={item.menuItemId}><span>{item.quantity} × {item.name}</span><strong>{formatKzt(item.price * item.quantity)}</strong></div>)}</div>
          <dl className="pos-totals"><div><dt>Subtotal</dt><dd>{formatKzt(totals.subtotal)}</dd></div><div><dt>Service charge 10%</dt><dd>{formatKzt(totals.service)}</dd></div><div className="pos-grand-total"><dt>Total</dt><dd data-testid="bill-total">{formatKzt(totals.total)}</dd></div></dl>
          <fieldset className="payment-methods"><legend>Payment Method</legend>{paymentMethods.map(name => { const Icon = methodIcons[name]; return <GlassButton key={name} className={`subtle ${method === name ? 'is-selected' : ''}`} aria-pressed={method === name} onClick={() => { setMethod(name); setError(''); }}><Icon size={19}/>{name}</GlassButton>; })}</fieldset>
          {method === 'Cash' ? <div className="table-form payment-cash"><label>Amount received<input type="number" min={0} step={1} aria-label="Amount received" value={received} onChange={event => setReceived(event.target.value)} placeholder="Enter amount in KZT"/></label><div className="payment-change"><span>{change !== null && change < 0 ? 'Still due' : 'Change'}</span><strong data-testid="cash-change">{formatKzt(Math.abs(change ?? 0))}</strong></div></div> : method && <p className="payment-simulation">Payment will be simulated for this prototype.</p>}
          <div className="payment-split"><label><input type="checkbox" checked={split} onChange={event => setSplit(event.target.checked)}/><span>Split Bill</span></label>{split && <div><label>Split equally<select aria-label="Split between guests" value={people} onChange={event => setPeople(Number(event.target.value))}>{[2, 3, 4].map(count => <option key={count} value={count}>{count} people</option>)}</select></label><p data-testid="split-amount">{shares.every(share => share === shares[0]) ? `${formatKzt(shares[0])} per guest` : shares.map((share, index) => `Guest ${index + 1}: ${formatKzt(share)}`).join(' · ')}</p><small>Split is a calculation only. Complete Payment settles the full bill.</small></div>}</div>
          {error && <p className="inventory-form-error" role="alert">{error}</p>}
          <GlassButton className="primary payment-complete" onClick={complete} aria-busy={processing} disabled={processing || (method === 'Cash' && (!received.trim() || !Number.isSafeInteger(Number(received)) || Number(received) < totals.total))}><Check size={17}/>{processing ? 'Processing…' : 'Complete Payment'}</GlassButton>
          <p className="payment-local-note">No real payment is collected.</p>
        </>}
        {modal === 'receipt' && receipt && <><div className="payment-receipt-status"><span><Check size={23}/></span><div><strong>{tableName(receipt.tableId)} · {formatKzt(receipt.total)}</strong><p>{receipt.status === 'Refunded' ? 'Refunded locally' : `Paid by ${receipt.method}`}</p></div><Badge tone={receipt.status === 'Paid' ? 'green' : 'neutral'}>{receipt.status}</Badge></div><GlassPanel className="payment-receipt"><h3>TERA<span>.</span></h3><p>The Oak & Ember</p><div className="payment-receipt-meta"><strong>Receipt #{receipt.id}</strong><span>{tableName(receipt.tableId)} · Order #{receipt.orderId}</span><span>{paymentTimestamp(receipt.paidAt)}</span></div><div className="payment-bill-lines">{receipt.items.map(item => <div key={item.menuItemId}><span>{item.quantity} × {item.name}</span><strong>{formatKzt(item.price * item.quantity)}</strong></div>)}</div><dl className="pos-totals"><div><dt>Subtotal</dt><dd>{formatKzt(receipt.subtotal)}</dd></div><div><dt>Service 10%</dt><dd>{formatKzt(receipt.service)}</dd></div><div className="pos-grand-total"><dt>TOTAL</dt><dd>{formatKzt(receipt.total)}</dd></div><div><dt>Payment</dt><dd>{receipt.method}</dd></div>{receipt.method === 'Cash' && <><div><dt>Received</dt><dd>{formatKzt(receipt.cashReceived!)}</dd></div><div><dt>Change</dt><dd>{formatKzt(receipt.change!)}</dd></div></>}{receipt.splitCount > 1 && <div><dt>Split between {receipt.splitCount}</dt><dd>{receipt.shares.map(formatKzt).join(' / ')}</dd></div>}</dl><p className="payment-local-note">Prototype receipt · simulated transaction</p></GlassPanel><GlassButton className="subtle payment-complete" onClick={() => closePayment()}>Close</GlassButton></>}
        {modal === 'refund' && receipt && <><p className="table-detail-copy">Mark transaction {receipt.id} for {formatKzt(receipt.total)} as refunded? This changes the local record only and does not return real money. The bill will remain settled.</p><div className="table-dialog-actions"><GlassButton className="subtle" onClick={() => closePayment()}>Cancel</GlassButton><GlassButton className="danger" onClick={() => { store.refund(receipt.id); setNotice('Payment marked as refunded'); closePayment(); }}>Confirm simulated refund</GlassButton></div></>}
      </dialog>}
    </div>
  );
}
