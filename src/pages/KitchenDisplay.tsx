import { useEffect, useState } from 'react';
import { ArrowDownWideNarrow, ChefHat, Clock3 } from 'lucide-react';
import { GlassButton } from '../components/ui';
import { KitchenColumn, type KitchenStatus } from '../components/KitchenWorkflow';
import { useOrders } from '../data/OrderContext';
import { usePayments } from '../data/PaymentContext';

const kitchenStatuses: KitchenStatus[] = ['New', 'Preparing', 'Ready'];
const filters = ['All Orders', 'Dine-in', 'Takeaway'] as const;

export default function KitchenDisplay() {
  const { orders, advanceOrder, storageAvailable } = useOrders();
  const { transactions } = usePayments();
  const [now, setNow] = useState(Date.now);
  const [filter, setFilter] = useState<(typeof filters)[number]>('All Orders');
  const [sort, setSort] = useState('oldest');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const active = orders.filter(order => order.status !== 'Served' && !transactions.some(payment => payment.orderId === order.id));
  const visible = active.filter(order => filter === 'All Orders' || (order.serviceType ?? 'Dine-in') === filter)
    .sort((a, b) => (Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id) * (sort === 'oldest' ? 1 : -1));
  const prepTimes = orders.filter(order => order.prepStartedAt && order.readyAt)
    .map(order => Math.max(0, Date.parse(order.readyAt!) - Date.parse(order.prepStartedAt!)) / 60000);
  const average = prepTimes.length ? prepTimes.reduce((sum, minutes) => sum + minutes, 0) / prepTimes.length : null;
  function advance(id: number) {
    const current = orders.find(order => order.id === id);
    advanceOrder(id);
    const action = current?.status === 'New' ? 'is now preparing' : current?.status === 'Preparing' ? 'is ready for service' : 'is complete';
    setNotice(`Order #${id} ${action}.`);
  }

  return (
    <div className="kds-page">
      <div className="page-heading">
        <div><div className="eyebrow">THE HEART OF YOUR SERVICE</div><h1>Kitchen Display</h1><p>Live kitchen workflow and order preparation.</p></div>
        <div className="kds-header-metrics"><div><span><ChefHat size={14}/>Live Orders</span><strong>{active.length}</strong></div><div><span><Clock3 size={14}/>Average Prep Time</span><strong>{average === null ? '—' : average < 1 ? '<1 min' : `${Math.round(average)} min`}</strong><small>{average === null ? 'Awaiting completed preparation' : 'Measured preparation time'}</small></div></div>
      </div>
      <div className="kds-toolbar">
        <div className="table-filters" role="group" aria-label="Kitchen order type">{filters.map(name => <GlassButton key={name} className={`table-filter ${filter === name ? 'is-selected' : ''}`} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</GlassButton>)}</div>
        <div className="kds-toolbar-right"><span className="live-status"><i/>Kitchen live</span><label className="kds-sort"><ArrowDownWideNarrow size={15}/><span>Sort</span><select aria-label="Sort kitchen orders" value={sort} onChange={event => setSort(event.target.value)}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label></div>
      </div>
      <div className="kds-board">{kitchenStatuses.map(status => <KitchenColumn key={status} status={status} orders={visible.filter(order => order.status === status)} now={now} onAdvance={advance}/>)}</div>
      <div className="kds-footer"><span>One kitchen. One shared order flow.</span><span>{storageAvailable ? 'Orders and drafts saved on this device' : 'Local storage unavailable · orders kept for this session'}</span></div>
      <p className={`kds-announcement ${notice ? 'tera-feedback' : ''}`} role="status" aria-live="polite">{notice}</p>
    </div>
  );
}
