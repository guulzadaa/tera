import { Link, Route, Routes } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import Layout, { navigation } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tables from './pages/Tables';
import OrdersPOS from './pages/OrdersPOS';
import KitchenDisplay from './pages/KitchenDisplay';
import Inventory from './pages/Inventory';
import Payments from './pages/Payments';
import Analytics from './pages/Analytics';
import Forecasting from './pages/Forecasting';
import Menu from './pages/Menu';
import { TableProvider } from './data/TableContext';
import { MenuProvider } from './data/MenuContext';
import { PaymentProvider } from './data/PaymentContext';
import { InventoryProvider } from './data/InventoryContext';
import { OrderProvider } from './data/OrderContext';
import { GlassCard } from './components/ui';
function Guide() {
  return <><div className="page-heading"><div><h1>TERA guide</h1><p>A connected workflow, from welcome to receipt.</p></div></div><div className="analytics-grid">{[
    ['/menu', '1. Prepare the menu', 'Set prices and availability. POS uses the same menu.'],
    ['/tables', '2. Welcome your guests', 'Start an order at an available table or seat a reservation.'],
    ['/orders', '3. Take the order', 'Choose dishes, quantities and notes, then send the order to the kitchen.'],
    ['/kitchen', '4. Prepare and serve', 'Move tickets from New to Preparing, Ready and Complete.'],
    ['/payments', '5. Settle the bill', 'Simulate a payment and review the receipt. Paid tables become available.'],
    ['/analytics', '6. Review performance', 'Explore live payments, orders and clearly labeled demo history.'],
    ['/inventory', '7. Review stock', 'Update ingredient quantities and review the stock-change history.'],
    ['/forecast', '8. Plan ahead', 'Explore deterministic prototype demand and live inventory recommendations.'],
  ].map(([path, title, copy]) => <GlassCard className="analytics-panel" key={path}><h2>{title}</h2><p className="table-detail-copy">{copy}</p><Link className="button subtle" to={path}>Open section<ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }}/></Link></GlassCard>)}</div></>;
}
function Placeholder({title}: {title: string}) {return <div className="placeholder card"><Construction size={36}/><span className="eyebrow">COMING NEXT</span><h1>{title}</h1><p>This section is planned for the next phase of the TERA prototype.</p><Link to="/" className="button primary"><ArrowLeft size={16}/>Back to dashboard</Link></div>;}
export default function App() {return <MenuProvider><OrderProvider><InventoryProvider><PaymentProvider><TableProvider><Routes><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="/tables" element={<Tables/>}/><Route path="/orders" element={<OrdersPOS/>}/><Route path="/kitchen" element={<KitchenDisplay/>}/><Route path="/inventory" element={<Inventory/>}/><Route path="/payments" element={<Payments/>}/><Route path="/analytics" element={<Analytics/>}/><Route path="/forecast" element={<Forecasting/>}/><Route path="/menu" element={<Menu/>}/>{navigation.slice(1).filter(n => n.path !== '/tables' && n.path !== '/orders' && n.path !== '/kitchen' && n.path !== '/inventory' && n.path !== '/payments' && n.path !== '/analytics' && n.path !== '/forecast' && n.path !== '/menu').map(n => <Route key={n.path} path={n.path} element={<Placeholder title={n.label}/>}/>)}<Route path="/login" element={<Placeholder title="Staff login"/>}/><Route path="/help" element={<Guide/>}/><Route path="*" element={<Placeholder title="Page not found"/>}/></Route></Routes></TableProvider></PaymentProvider></InventoryProvider></OrderProvider></MenuProvider>;}



