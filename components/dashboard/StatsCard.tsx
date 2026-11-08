import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
}

// MADETRUE palette: cream ground, green accents, Lora numerals — never the
// default shadcn slate styling.
export default function StatsCard({
  title,
  value,
  icon,
  description,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-warm-brown/10 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-warm-brown">
          {title}
        </span>
        {icon && (
          <span
            aria-hidden="true"
            className="p-2 rounded-lg bg-primary-green/10 text-primary-green"
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-text-dark">
        {value}
      </p>
      {description && (
        <p className="mt-1 text-[11px] text-text-dark/60 leading-snug">
          {description}
        </p>
      )}
    </div>
  );
}
