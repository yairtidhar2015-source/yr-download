import { cn } from "@/lib/utils";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string };

export function Field({ label, name, hint, className, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-navy-700">{label}</span>
      <input
        id={name}
        name={name}
        className={cn(
          "h-11 w-full rounded-xl border border-navy-100 bg-white px-3.5 text-navy-900 placeholder:text-navy-400/60 transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100",
          className,
        )}
        {...props}
      />
      {hint && <span className="mt-1 block text-xs text-navy-400">{hint}</span>}
    </label>
  );
}
