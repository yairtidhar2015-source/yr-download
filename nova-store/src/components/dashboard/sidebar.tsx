"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingBag, Store, UserCircle, Users, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { logoutAction } from "@/lib/auth/actions";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function DashboardShell({ userName, email, children }: { userName: string; email: string; children: React.ReactNode }) {
  const { t } = useI18n();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { href: "/dashboard", label: t.dash.overview, icon: LayoutDashboard, ready: true },
    { href: "/dashboard/stores", label: t.dash.stores, icon: Store, ready: false },
    { href: "/dashboard/products", label: t.dash.products, icon: Package, ready: false },
    { href: "/dashboard/orders", label: t.dash.orders, icon: ShoppingBag, ready: false },
    { href: "/dashboard/customers", label: t.dash.customers, icon: Users, ready: false },
    { href: "/dashboard/analytics", label: t.dash.analytics, icon: BarChart3, ready: false },
    { href: "/dashboard/settings", label: t.dash.settings, icon: Settings, ready: false },
    { href: "/dashboard/profile", label: t.dash.profile, icon: UserCircle, ready: true },
  ];

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map(({ href, label, icon: Icon, ready }) => {
        const active = path === href;
        const cls = cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
          active ? "bg-brand-600 text-white shadow-glow" : ready ? "text-navy-500 hover:bg-brand-50 hover:text-brand-700" : "cursor-not-allowed text-navy-400/60");
        return ready ? (
          <Link key={href} href={href} className={cls} onClick={() => setOpen(false)}><Icon className="h-5 w-5" />{label}</Link>
        ) : (
          <span key={href} className={cls} aria-disabled="true"><Icon className="h-5 w-5" />{label}
            <span className="ms-auto rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-400">{t.dash.soon}</span></span>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-navy-100 pt-4">
      <div className="mb-3 px-1"><p className="truncate text-sm font-semibold text-navy-900">{userName}</p><p className="truncate text-xs text-navy-400" dir="ltr">{email}</p></div>
      <div className="flex items-center justify-between">
        <LanguageSwitcher />
        <form action={logoutAction}>
          <button className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-navy-500 hover:bg-red-50 hover:text-red-600"><LogOut className="h-4 w-4 flip-rtl" />{t.common.logout}</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sky-25 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-e border-navy-100 bg-white p-5 lg:flex">
        <Link href="/"><Logo /></Link>{nav}{footer}
      </aside>
      <div className="flex items-center justify-between border-b border-navy-100 bg-white px-4 py-3 lg:hidden">
        <Link href="/"><Logo /></Link>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2" aria-label={t.common.menu}><Menu /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col gap-6 bg-white p-5">
            <div className="flex items-center justify-between"><Logo /><button onClick={() => setOpen(false)} aria-label={t.common.cancel}><X /></button></div>
            {nav}{footer}
          </aside>
        </div>
      )}
      <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  );
}
