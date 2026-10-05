import { Armchair, Check, ChefHat, Clock3, Users } from 'lucide-react';
import { Badge, GlassButton, GlassCard, GlassPanel } from './ui';
import type { RestaurantOrder } from '../data/orderModel';

export type KitchenStatus = 'New' | 'Preparing' | 'Ready';
const actions = { New: 'Start Preparing', Preparing: 'Mark as Ready', Ready: 'Complete Order' };
const tone = { New: 'orange', Preparing: 'orange', Ready: 'green' } as const;
export const elapsedSeconds = (createdAt: string, now: number) => Math.max(0, Math.floor((now - Date.parse(createdAt)) / 1000));

export function OrderTimer({ seconds }: { seconds: number }) {
  return <span className="kds-timer" aria-label={`Waiting ${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`}><Clock3 size={14}/><time>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</time></span>;
}

export function KitchenOrderCard({ order, now, onAdvance }: { order: RestaurantOrder; now: number; onAdvance: (id: number) => void }) {
  const seconds = elapsedSeconds(order.createdAt, now);
  const urgency = seconds >= 1200 ? 'delayed' : seconds >= 600 ? 'waiting' : 'normal';
  const recent = order.status === 'New' && now - Date.parse(order.updatedAt) < 60000;
  const status = order.status as KitchenStatus;
  return (
    <GlassCard className={`kds-order urgency-${urgency} ${recent ? 'kds-recent' : ''}`}>
      <div className="kds-ticket-header"><h3>#{order.id}</h3><div>{urgency === 'delayed' && <Badge tone="orange">Delayed</Badge>}<Badge tone={tone[status]}>{status}</Badge></div></div>
      <div className="kds-table"><Armchair size={15}/><strong>TABLE {String(order.tableId).padStart(2, '0')}</strong>{order.serviceType === 'Takeaway' && <Badge tone="blue">Takeaway</Badge>}</div>
      <div className="kds-ticket-meta"><span><Users size={14}/>{order.guests} {order.guests === 1 ? 'guest' : 'guests'}</span><OrderTimer seconds={seconds}/></div>
      <p className="kds-created">Created at {new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Yekaterinburg' })}</p>
      <ul className="kds-dishes">{order.items.map(item => <li key={item.menuItemId}><span>{item.quantity} ×</span>{item.name}</li>)}</ul>
      {order.notes.trim() && <div className="kds-request"><span>Special request</span><p>{order.notes}</p></div>}
      <GlassButton className={status === 'Ready' ? 'subtle kds-complete' : 'primary'} onClick={() => onAdvance(order.id)}>{status === 'Ready' ? <Check size={17}/> : <ChefHat size={17}/>}{actions[status]}</GlassButton>
    </GlassCard>
  );
}

export function KitchenColumn({ status, orders, now, onAdvance }: { status: KitchenStatus; orders: RestaurantOrder[]; now: number; onAdvance: (id: number) => void }) {
  return (
    <GlassPanel className={`kds-column kds-column-${status.toLowerCase()}`}>
      <div className="kds-column-heading"><h2><i/>{status.toUpperCase()}</h2><span>{orders.length}</span></div>
      <div className="kds-tickets">{orders.map(order => <KitchenOrderCard key={order.id} order={order} now={now} onAdvance={onAdvance}/>)}</div>
      {!orders.length && <div className="kds-empty"><ChefHat size={29} strokeWidth={1.2}/><h3>{status === 'New' ? 'No orders waiting' : status === 'Preparing' ? 'Nothing on the pass' : 'No orders ready yet'}</h3><p>{status === 'New' ? 'Kitchen is all caught up.' : status === 'Preparing' ? 'Start an order to begin preparation.' : 'Freshly finished dishes will appear here.'}</p></div>}
    </GlassPanel>
  );
}
