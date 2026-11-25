import { cn } from "@/lib/utils";

/** NOVA STORE mark: a four-point star ("nova") inside a rounded bag shape. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden="true">
      <defs>
        <linearGradient id="nova-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a97fc" />
          <stop offset="1" stopColor="#1a43d1" />
        </linearGradient>
      </defs>
      <rect x="2" y="8" width="36" height="30" rx="9" fill="url(#nova-g)" />
      <path d="M13 11V9a7 7 0 0 1 14 0v2" fill="none" stroke="#1a43d1" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 14.5c.8 4.6 2.4 6.2 7 7-4.6.8-6.2 2.4-7 7-.8-4.6-2.4-6.2-7-7 4.6-.8 6.2-2.4 7-7Z" fill="#fff" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} dir="ltr">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-navy-900">
        NOVA<span className="text-brand-600"> STORE</span>
      </span>
    </span>
  );
}
