import { useId, useState } from 'react';
import { formatKzt } from '../data/orderModel';

export type ChartPoint = { label: string; date: string; revenue: number; orders: number };
export default function AnalyticsChart({ points, title, kind = 'area', metric = 'revenue' }: { points: ChartPoint[]; title: string; kind?: 'area' | 'bars'; metric?: 'revenue' | 'orders' }) {
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const max = Math.max(1, ...points.map(point => point[metric])) * 1.15;
  const width = 640, bottom = 190;
  const x = (i: number) => 16 + i * (width - 32) / Math.max(1, points.length - 1);
  const y = (i: number) => bottom - points[i][metric] / max * 165;
  const curve = points.map((_, i) => i ? `C ${(x(i - 1) + x(i)) / 2} ${y(i - 1)}, ${(x(i - 1) + x(i)) / 2} ${y(i)}, ${x(i)} ${y(i)}` : `M ${x(i)} ${y(i)}`).join(' ');
  const selected = active === null ? null : points[active];
  const busiest = points.reduce((best, point, i) => point[metric] > points[best][metric] ? i : best, 0);
  return <div className="analytics-chart" onMouseLeave={() => setActive(null)}>
    <div className="analytics-y-axis">{[1, .5, 0].map(value => <span key={value}>{metric === 'revenue' ? `₸${Math.round(max * value / 1000)}k` : Math.round(max * value)}</span>)}</div>
    <div className="analytics-plot">
      <svg viewBox="0 0 640 205" preserveAspectRatio="none" role="img" aria-label={title}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#da9677" stopOpacity=".28"/><stop offset="100%" stopColor="#da9677" stopOpacity="0"/></linearGradient></defs>
        {[25, 107, 190].map(level => <line key={level} x1="0" x2="640" y1={level} y2={level} stroke="#ffffff09"/>)}
        {kind === 'area' ? <><path d={`${curve} L ${x(points.length - 1)} ${bottom} L 16 ${bottom} Z`} fill={`url(#${id})`}/><path d={curve} fill="none" stroke="#da9677" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></> : points.map((point, i) => <rect key={i} x={i * width / points.length + 5} y={y(i)} width={Math.max(2, width / points.length - 10)} height={bottom - y(i)} rx="5" fill={i === busiest ? '#da9677' : '#b6947b'} opacity={active === i || i === busiest ? .9 : .45}><title>{point.date}: {point.orders} orders</title></rect>)}
        {active !== null && kind === 'area' && <><line x1={x(active)} x2={x(active)} y1="15" y2={bottom} stroke="#da96774d" strokeDasharray="3 5"/><circle cx={x(active)} cy={y(active)} r="4" fill="#efc5ab"/></>}
      </svg>
      <div className="analytics-chart-targets">{points.map((point, i) => <button type="button" key={i} aria-label={`${title}: ${point.date}, ${metric === 'revenue' ? `${formatKzt(point.revenue)}, ` : ''}${point.orders} orders`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)} />)}</div>
      {selected && <div role="tooltip" className="analytics-tooltip" style={{ left: `${Math.max(22, Math.min(78, (active! + .5) / points.length * 100))}%` }}><strong>{selected.date}</strong>{metric === 'revenue' && <span>{formatKzt(selected.revenue)}</span>}<small>{selected.orders} orders</small></div>}
      <div className="analytics-x-axis">{points.map((point, i) => <span key={i}>{points.length <= 12 || i % 5 === 0 || i === points.length - 1 ? point.label : ''}</span>)}</div>
    </div>
  </div>;
}
