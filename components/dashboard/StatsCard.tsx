import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
}

export default function StatsCard({ title, value, icon, description }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {icon && (
          <div className="rounded-md bg-slate-100 p-2 text-slate-700">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
      {description && (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      )}
    </div>
  );
}
