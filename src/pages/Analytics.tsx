import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ArrowRight, Armchair, Banknote, CreditCard, Download, Package, QrCode, ShoppingBag, Users, Wallet } from 'lucide-react';
import { GlassCard, GlassButton, Badge } from '../components/ui';
import AnalyticsChart, { type ChartPoint } from '../components/AnalyticsChart';
import { useOrders } from '../data/OrderContext';
import { usePayments } from '../data/PaymentContext';
import { useInventory } from '../data/InventoryContext';
import { buildAnalytics, type AnalyticsRange } from '../data/analyticsModel';
import { createAnalyticsHistory } from '../data/analyticsMock';
import { formatKzt } from '../data/orderModel';
import { paymentDay } from '../data/paymentModel';

const colors = ['#da9677', '#bda68d', '#938877', '#b0a19c', '#85767e', '#a57663', '#77706c'];
const percentage = (value: number, total: number) => total ? `${(value / total * 100).toFixed(1)}%` : '0%';
function Change({ value, previous }: { value: number; previous: number }) {
  if (!previous) return <span className="analytics-comparison">{value ? 'No prior baseline' : 'No activity'}</span>;
  const change = (value - previous) / previous * 100;
  const Icon = change < 0 ? ArrowDownRight : ArrowUpRight;
  return <span className={`analytics-comparison ${change < 0 ? 'negative' : 'positive'}`}><Icon size={13}/>{change >= 0 ? '+' : ''}{change.toFixed(1)}% <small>vs previous period</small></span>;
}
export default function Analytics() {
  const [range, setRange] = useState<AnalyticsRange>(7);
  const [exported, setExported] = useState(false);
  const { orders } = useOrders();
  const { transactions } = usePayments();
  const { items } = useInventory();
  const today = paymentDay(new Date().toISOString());
  const history = useMemo(() => createAnalyticsHistory(today), [today]);
  const data = useMemo(() => buildAnalytics(range, history, orders, transactions, today), [range, history, orders, transactions, today]);
  const stockCounts = ['Healthy', 'Low Stock', 'Critical'].map(status => ({ status, count: items.filter(item => item.status === status).length }));
  const points: ChartPoint[] = range === 1 ? Array.from({ length: 24 }, (_, hour) => ({ label: `${String(hour).padStart(2, '0')}:00`, date: `Today, ${String(hour).padStart(2, '0')}:00`, orders: data.hours[hour].orders, revenue: transactions.filter(transaction => transaction.status === 'Paid' && paymentDay(transaction.paidAt) === today && Number(new Date(transaction.paidAt).toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Yekaterinburg' })) === hour).reduce((sum, transaction) => sum + transaction.total, 0) })) : data.days.map(day => ({ ...day, label: new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-GB', range === 7 ? { weekday: 'short' } : { day: 'numeric' }), date: new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) }));
  const categoryTotal = data.categories.reduce((sum, category) => sum + category.revenue, 0);
  let angle = 0;
  const segments = data.categories.map((category, i) => { const start = angle; angle += categoryTotal ? category.revenue / categoryTotal * 360 : 0; return `${colors[i]} ${start}deg ${angle}deg`; });
  const methodTotal = data.methods.reduce((sum, method) => sum + method.revenue, 0);
  const peak = data.hours.reduce((best, hour) => hour.orders > best.orders ? hour : best, data.hours[0]);
  const activeHours = data.hours.filter(hour => hour.orders > 0);
  const peakPoints = data.hours.slice(12, 23).map(hour => ({ label: String(hour.hour), date: `${hour.hour}:00 – ${hour.hour + 1}:00`, orders: hour.orders, revenue: 0 }));
  const busiestTable = [...data.tables].sort((a, b) => b.orders - a.orders)[0];
  const richestTable = [...data.tables].sort((a, b) => b.revenue - a.revenue)[0];
  function exportReport() {
    const rows = [['TERA Analytics', `${range} day range`], ['Source', 'Live application state plus labeled demo history'], ['Date', 'Revenue KZT (service included)', 'Orders', 'Guests', 'Source'], ...data.days.map(day => [day.date, day.revenue, day.orders, day.guests, day.source]), ['Payment methods (actual transactions only)', 'KZT'], ...data.methods.map(method => [method.name, method.revenue])];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `TERA-analytics-${today}-${range}days.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setExported(true);
  }
  return <div className="analytics-page">
    <div className="page-heading"><div><div className="eyebrow">A CLEARER VIEW OF YOUR RESTAURANT</div><h1>Analytics</h1><p>Understand sales, orders and restaurant performance.</p></div><div className="heading-actions"><div className="analytics-range" aria-label="Date range">{([1, 7, 30] as const).map(value => <GlassButton key={value} aria-pressed={range === value} onClick={() => { setRange(value); setExported(false); }}>{value === 1 ? 'Today' : `${value} Days`}</GlassButton>)}</div><GlassButton onClick={exportReport} aria-label="Export Report"><Download size={15}/><span>Export</span></GlassButton></div></div>
    <div className="analytics-source"><Badge tone="green"><i/>Live workspace</Badge><span>{range === 1 ? 'Today uses current orders & paid transactions.' : `${data.days.filter(day => day.source === 'Demo history').length} days of demo history · live workspace dates replace demo data.`} Comparisons may include demo history.</span></div>
    {exported && <p role="status" className="analytics-export-status">CSV report downloaded.</p>}
    <div className="stats-grid analytics-kpis">{[{ label: 'Revenue', value: data.totals.revenue, previous: data.previous.revenue, icon: Wallet, currency: true }, { label: 'Orders', value: data.totals.orders, previous: data.previous.orders, icon: ShoppingBag }, { label: 'Average Order Value', value: data.totals.average, previous: data.previous.average, icon: CreditCard, currency: true }, { label: 'Guests Served', value: data.totals.guests, previous: data.previous.guests, icon: Users }].map(metric => <GlassCard className="stat" key={metric.label}><div className="stat-top"><span>{metric.label}</span><span className="stat-icon"><metric.icon size={19}/></span></div><strong>{metric.currency ? formatKzt(metric.value) : metric.value.toLocaleString()}</strong><Change value={metric.value} previous={metric.previous}/></GlassCard>)}</div>
    <p className="analytics-definition">Revenue & guests use paid receipts, excluding refunds. Orders include active visits; average value = revenue ÷ paid orders. Demo history follows the same definitions.</p>
    <div className="analytics-grid">
      <GlassCard className="analytics-panel"><div className="card-heading"><div><h2>Revenue Overview</h2><p>The rhythm of your restaurant.</p></div><Badge tone="orange">{range === 1 ? 'Today' : `${range} days`}</Badge></div><div className="analytics-panel-total">{formatKzt(data.totals.revenue)}<small>incl. 10% service</small></div><AnalyticsChart points={points} title="Revenue Overview"/><div className="analytics-chart-legend"><i/>Revenue<span>{range === 1 ? 'Live payments' : 'Demo history + live dates'}</span></div></GlassCard>
      <GlassCard className="analytics-panel"><div className="card-heading"><div><h2>Popular Dishes</h2><p>What guests come back for.</p></div><span className="tiny-label">TOP 5</span></div><div className="analytics-dishes">{data.dishes.slice(0, 5).map((dish, i) => <div className="analytics-dish" key={dish.name}><span className="dish-rank">0{i + 1}</span><div><strong>{dish.name}</strong><small>{dish.quantity} sold <span>·</span> {formatKzt(dish.revenue)}</small><div className="analytics-meter"><i style={{ width: `${dish.quantity / data.dishes[0].quantity * 100}%` }}/></div></div></div>)}</div>{!data.dishes.length && <p className="analytics-empty">No paid dishes in this period.</p>}<p className="analytics-note">Item sales exclude service; live dates use paid receipt snapshots.</p></GlassCard>
      <GlassCard className="analytics-panel"><div className="card-heading"><div><h2>Orders by Day</h2><p>{range === 1 ? 'Recorded orders by hour.' : 'Service, one day at a time.'}</p></div><ShoppingBag size={18}/></div><AnalyticsChart points={points} title="Orders by Day" kind="bars" metric="orders"/></GlassCard>
      <GlassCard className="analytics-panel"><div className="card-heading"><div><h2>Sales by Category</h2><p>A balanced view of your menu.</p></div></div><div className="analytics-category-layout"><div className="analytics-donut" role="img" aria-label={`Sales by Category: ${data.categories.map(category => `${category.name} ${percentage(category.revenue, categoryTotal)}`).join(', ')}`} style={{ background: categoryTotal ? `conic-gradient(${segments.join(',')})` : '#ffffff12' }}><div><strong>{data.categories.filter(category => category.revenue > 0).length}</strong><small>categories</small></div></div><div className="analytics-category-list">{data.categories.map((category, i) => <div key={category.name}><span><i style={{ background: colors[i] }}/>{category.name}</span><b>{percentage(category.revenue, categoryTotal)}</b><small>{formatKzt(category.revenue)}</small></div>)}</div></div></GlassCard>
      <GlassCard className="analytics-panel"><div className="card-heading"><div><h2>Peak Hours</h2><p>Lunch to last service · hourly orders across the period.</p></div></div><AnalyticsChart points={peakPoints} title="Peak Hours" kind="bars" metric="orders"/><div className="analytics-peak-summary"><div><small>Peak time · all hours</small><strong>{peak.orders ? `${String(peak.hour).padStart(2, '0')}:00 – ${String((peak.hour + 1) % 24).padStart(2, '0')}:00` : 'No activity yet'}</strong></div><div><small>Average orders · active hours</small><strong>{activeHours.length ? (data.totals.orders / (activeHours.length * range)).toFixed(1) : '0'} / hour</strong></div></div><p className="analytics-note">The chart shows 12:00–22:00; the peak and average include all recorded hours.</p></GlassCard>
      <GlassCard className="analytics-panel"><div className="card-heading"><div><h2>Payment Methods</h2><p>Actual paid transactions only.</p></div><Badge>Live</Badge></div><div className="analytics-methods">{data.methods.map(method => { const Icon = method.name === 'Card' ? CreditCard : method.name === 'Cash' ? Banknote : QrCode; return <div key={method.name}><div className="analytics-method-top"><span><Icon size={19}/>{method.name}</span><strong>{percentage(method.revenue, methodTotal)}</strong></div><div className="analytics-meter"><i style={{ width: percentage(method.revenue, methodTotal) }}/></div><small>{formatKzt(method.revenue)}</small></div>; })}</div>{!methodTotal && <p className="analytics-note">No paid transactions in this period.</p>}<p className="analytics-note">Refunds excluded · no synthetic payment-method data.</p></GlassCard>
      <GlassCard className="analytics-panel"><div className="card-heading"><div><h2>Inventory Insight</h2><p>Stock health, right now.</p></div><Package size={18}/></div><div className="analytics-stock">{stockCounts.map((stock, i) => <div key={stock.status}><span className={`analytics-stock-dot stock-${i}`}/><strong>{stock.count}</strong><small>{stock.status === 'Healthy' ? 'Healthy Stock' : stock.status}</small></div>)}</div><div className="analytics-inventory-footer"><span>{stockCounts[1].count + stockCounts[2].count} ingredients need attention</span><Link to="/inventory" className="button glass-button">View Inventory<ArrowRight size={14}/></Link></div></GlassCard>
      <GlassCard className="analytics-panel"><div className="card-heading"><div><h2>Table Performance</h2><p>Current workspace records in this period.</p></div><Armchair size={18}/></div><div className="analytics-table-performance"><div><span>Most Used Table</span><strong>{busiestTable.orders ? `Table ${String(busiestTable.id).padStart(2, '0')}` : 'No visits yet'}</strong><small>{busiestTable.orders} visits</small></div><div><span>Highest Revenue Table</span><strong>{richestTable.revenue ? `Table ${String(richestTable.id).padStart(2, '0')}` : 'No paid tables'}</strong><small>{formatKzt(richestTable.revenue)}</small></div><div><span>Average Table Turnover</span><strong>{data.turnover === null ? 'Not enough history' : `${Math.floor(data.turnover / 60)}h ${data.turnover % 60}m`}</strong><small>Recorded creation → served duration</small></div></div></GlassCard>
    </div>
  </div>;
}
