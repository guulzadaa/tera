import { useState } from 'react';
import type { ForecastDay } from '../data/forecastModel';
import { forecastDate } from '../utils/forecasting';

export default function ForecastChart({ days }: { days: ForecastDay[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map(day => day.upper)) * 1.08;
  const x = (i: number) => 12 + i * 616 / Math.max(1, days.length - 1);
  const y = (value: number) => 200 - value / max * 180;
  function path(key: 'orders' | 'baseline' | 'upper' | 'lower') {
    return days.map((day, i) => i ? `C ${(x(i - 1) + x(i)) / 2} ${y(days[i - 1][key])}, ${(x(i - 1) + x(i)) / 2} ${y(day[key])}, ${x(i)} ${y(day[key])}` : `M ${x(i)} ${y(day[key])}`).join(' ');
  }
  const band = `${path('upper')} ${days.map((_, i) => { const index = days.length - 1 - i; return `L ${x(index)} ${y(days[index].lower)}`; }).join(' ')} Z`;
  const point = active === null ? null : days[active];
  return <div className="forecast-demand-chart" onMouseLeave={() => setActive(null)}>
    <div className="forecast-y-axis">{[1, .5, 0].map(value => <span key={value}>{Math.round(max * value)}</span>)}</div>
    <div className="forecast-demand-plot"><svg viewBox="0 0 640 215" preserveAspectRatio="none" role="img" aria-label="Baseline and predicted orders with illustrative confidence band">
      {[20, 110, 200].map(level => <line key={level} x1="0" x2="640" y1={level} y2={level} stroke="#ffffff09"/>)}
      <path d={band} fill="#da96771b"/><path d={path('baseline')} fill="none" stroke="#a39b96" strokeWidth="1.6" strokeDasharray="5 6" vectorEffect="non-scaling-stroke"/><path d={path('orders')} fill="none" stroke="#da9677" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>
      {active !== null && <circle cx={x(active)} cy={y(days[active].orders)} r="4" fill="#efc5ab"/>}
    </svg><div className="forecast-chart-targets">{days.map((day, i) => <button key={day.date} aria-label={`Forecast ${forecastDate(day.date)}: ${day.orders} orders, ${day.guests} guests, ${day.confidence}% demo confidence`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)}/>)}</div>
      {point && <div role="tooltip" className="analytics-tooltip forecast-tooltip" style={{ left: `${Math.max(24, Math.min(76, (active! + .5) / days.length * 100))}%` }}><strong>{forecastDate(point.date)}</strong><span>Predicted Orders · {point.orders}</span><small>Expected Guests · {point.guests}</small><small>Confidence · {point.confidence}% (demo)</small></div>}
      <div className="analytics-x-axis">{days.map((day, i) => <span key={day.date}>{days.length <= 7 ? new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short' }) : i % 5 === 0 || i === days.length - 1 ? new Date(`${day.date}T12:00:00Z`).getUTCDate() : ''}</span>)}</div>
    </div>
  </div>;
}
