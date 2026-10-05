import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
type GlassProps = { children: ReactNode; className?: string };

export function GlassPanel({ children, className = '' }: GlassProps) {
  return <section className={`glass-panel ${className}`}>{children}</section>;
}

export function GlassCard({ children, className = '' }: GlassProps) {
  return <GlassPanel className={`card ${className}`}>{children}</GlassPanel>;
}

// Preserve the existing shared card API for all current routes.
export const Card = GlassCard;

export function GlassButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button glass-button ${className}`} {...props}>{children}</button>;
}
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'orange' | 'blue' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

type StatCardProps = {
  label: string;
  value: string;
  change: string;
  icon: ReactNode;
  detail: string;
};

export function StatCard({ label, value, change, icon, detail }: StatCardProps) {
  return (
    <GlassCard className="stat">
      <div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div>
      <strong>{value}</strong>
      <div className="stat-bottom">
        <span className="positive"><ArrowUpRight size={13}/>{change}</span><span>{detail}</span>
      </div>
    </GlassCard>
  );
}
