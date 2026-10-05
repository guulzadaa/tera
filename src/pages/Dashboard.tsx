import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ShoppingBag, Armchair, Package, ArrowUpRight, ArrowRight, Plus, CalendarDays, ChevronDown, Sparkles, MoreHorizontal, Clock3 } from 'lucide-react';
import { GlassCard, GlassPanel, GlassButton, Badge, StatCard } from '../components/ui';
import { useOrders } from '../data/OrderContext';
import { usePayments } from '../data/PaymentContext';
import { useInventory } from '../data/InventoryContext';
import { useTables } from '../data/TableContext';
import { buildAnalytics, restaurantHour } from '../data/analyticsModel';
import { createAnalyticsHistory } from '../data/analyticsMock';
import { formatKzt, orderTotals } from '../data/orderModel';
import { paymentDay } from '../data/paymentModel';
import AnalyticsChart from '../components/AnalyticsChart';

export default function Dashboard() {
  const [period, setPeriod] = useState<'today' | 'week'>('today');
  const orderStore = useOrders();
  const { transactions } = usePayments();
  const inventory = useInventory();
  const { tables } = useTables();
  const today = paymentDay(new Date().toISOString());
  const history = createAnalyticsHistory(today);
  const data = buildAnalytics(period === 'today' ? 1 : 7, history, orderStore.orders, transactions, today);
  const paid = transactions.filter(payment => payment.status === 'Paid' && paymentDay(payment.paidAt) === today);
  const orders = orderStore.orders.filter(order => order.status !== 'Served' && !transactions.some(payment => payment.orderId === order.id)).sort((a, b) => b.id - a.id);
  const occupied = tables.filter(table => table.status === 'Occupied').length;
  const lowStock = inventory.items.filter(item => item.status !== 'Healthy').length;
  const dishData = data.dishes.length ? data.dishes : buildAnalytics(7, history, orderStore.orders, transactions, today).dishes;
  const dishes = dishData.slice(0, 3).map(dish => ({ ...dish, sold: dish.quantity, revenue: formatKzt(dish.revenue), emoji: '✦', color: '#684f3e' }));
  const points = period === 'today' ? Array.from({ length: 12 }, (_, i) => {
    const hour = i * 2;
    return { label: `${hour}:00`, date: `Today, ${hour}:00 – ${hour + 2}:00`, orders: orderStore.orders.filter(order => paymentDay(order.createdAt) === today && Math.floor(restaurantHour(order.createdAt) / 2) === i).length, revenue: paid.filter(payment => Math.floor(restaurantHour(payment.paidAt) / 2) === i).reduce((sum, payment) => sum + payment.total, 0) };
  }) : data.days.map(day => ({ ...day, label: new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short' }) }));
  const growth = data.previous.revenue ? (data.totals.revenue / data.previous.revenue - 1) * 100 : 0;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR RESTAURANT, AT A GLANCE</div>
          <h1>Good afternoon <span className="wave" aria-hidden="true">✦</span></h1>
          <p>Here's what's happening at TERA today.</p>
        </div>
        <div className="heading-actions">
          <div className="date-control"><CalendarDays size={16}/><span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
          <Link to="/orders" className="button primary"><Plus size={17}/>New order</Link>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Today's Revenue" value={formatKzt(paid.reduce((sum, payment) => sum + payment.total, 0))} change={`${paid.length} paid`} detail="today · refunds excluded" icon={<Wallet size={20}/>}/>
        <StatCard label="Active Orders" value={String(orders.length)} change={`${orders.filter(order => order.status === 'New').length} new`} detail="in the kitchen" icon={<ShoppingBag size={20}/>}/>
        <StatCard label="Occupied Tables" value={`${occupied} / ${tables.length}`} change={`${Math.round(occupied / tables.length * 100)}%`} detail="occupancy rate" icon={<Armchair size={20}/>}/>
        <StatCard label="Low Stock Items" value={String(lowStock)} change="Low + critical" detail="need replenishing" icon={<Package size={20}/>}/>
      </div>

      <div className="middle-grid">
        <GlassCard className="revenue-card">
          <div className="card-heading">
            <div><h2>Revenue Overview</h2><p>A good day, getting even better.</p></div>
            <GlassButton className="subtle" onClick={() => setPeriod(period === 'today' ? 'week' : 'today')}>
              {period === 'today' ? 'Today' : 'This week'}<ChevronDown size={14}/>
            </GlassButton>
          </div>
          <div className="revenue-total">
            <strong>{formatKzt(data.totals.revenue)}</strong>
            <Badge tone={growth < 0 ? 'neutral' : 'green'}>{growth >= 0 ? '+' : ''}{growth.toFixed(1)}%</Badge>
            <span>vs. demo previous period</span>
          </div>
          <AnalyticsChart points={points} title="Dashboard revenue"/>
          <div className="chart-legend"><i/>Revenue <span>{period === 'today' ? 'Live paid transactions' : 'Live dates + demo history'}</span></div>
        </GlassCard>

        <GlassCard className="table-card">
          <div className="card-heading">
            <div><h2>Floor overview</h2><p>A seat for every guest.</p></div>
            <Link to="/tables" className="icon-link" aria-label="View tables"><ArrowUpRight size={20}/></Link>
          </div>
          <div className="floor-grid">
            {tables.map((table, index) => {
              const status = table.status.toLowerCase();
              return (
                <Link to="/tables" className={`floor-table ${status}`} key={index} aria-label={`Table ${index + 1}, ${status}`}>
                  <Armchair size={17}/><span>{String(index + 1).padStart(2, '0')}</span>
                </Link>
              );
            })}
          </div>
          <div className="floor-legend">
            <span><i className="occupied"/>Occupied <b>{occupied}</b></span>
            <span><i className="available"/>Available <b>{tables.filter(table => table.status === 'Available').length}</b></span>
          </div>
          <Link to="/tables" className="floor-link">Manage tables<ArrowRight size={15}/></Link>
        </GlassCard>
      </div>

      <div className="bottom-grid">
        <GlassCard className="orders-card">
          <div className="card-heading">
            <div className="title-row"><h2>Live Orders</h2><Badge>Live</Badge></div>
            <Link to="/orders" className="text-link">View all orders<ArrowRight size={14}/></Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th scope="col">Order / Table</th><th scope="col">Items</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{!orders.length && <tr><td colSpan={5}>No active orders. Start an order in POS to begin service.</td></tr>}
                {orders.slice(0, 4).map(order => (
                  <tr key={order.id}>
                    <td><strong>#{order.id}</strong><small>Table {String(order.tableId).padStart(2, '0')}</small></td>
                    <td><span className="order-items">{order.items.map(item => `${item.quantity} × ${item.name}`).join(', ')}</span><small><Clock3 size={10}/>{Math.max(0, Math.floor((Date.now() - Date.parse(order.createdAt)) / 60000))} min ago</small></td>
                    <td className="amount">{formatKzt(orderTotals(order.items).total)}</td>
                    <td><Badge tone={order.status === 'Ready' ? 'green' : order.status === 'Preparing' ? 'orange' : 'blue'}><i/>{order.status}</Badge></td>
                    <td><Link to={`/orders?table=${order.tableId}`} className="icon-link" aria-label={`View order ${order.id}`}><MoreHorizontal size={18}/></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard className="popular-card">
          <div className="card-heading">
            <div><h2>Popular Dishes</h2><p>{data.dishes.length ? 'Paid dishes in the selected period.' : 'Demo historical favorites.'}</p></div><span className="tiny-label">TOP 3</span>
          </div>
          <div className="dish-list">
            {dishes.map((dish, index) => (
              <div className="dish" key={dish.name}>
                <span className="dish-rank">{String(index + 1).padStart(2, '0')}</span>
                <div className="dish-image" style={{background: dish.color}} aria-hidden="true">{dish.emoji}</div>
                <div className="dish-info"><strong>{dish.name}</strong><small>{dish.sold} sold <span>·</span> {dish.category}</small></div>
                <div className="dish-value"><strong>{dish.revenue}</strong></div>
              </div>
            ))}
          </div>
          <Link to="/menu" className="floor-link">Explore menu<ArrowRight size={15}/></Link>
        </GlassCard>
      </div>

      <GlassPanel className="forecast-banner">
        <span className="forecast-icon"><Sparkles size={23}/></span>
        <div>
          <div className="title-row"><h3>A little foresight. A better service.</h3><Badge tone="orange">TERA AI</Badge></div>
          <p>Explore demand projections and stock recommendations based on historical demo patterns.</p>
        </div>
        <Link to="/forecast" className="button subtle">View forecast<ArrowUpRight size={16}/></Link>
      </GlassPanel>
    </>
  );
}
