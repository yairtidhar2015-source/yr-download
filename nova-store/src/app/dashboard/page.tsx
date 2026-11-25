import { BarChart3, CheckCircle2, Package, ShoppingBag, Store, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { t } = await getI18n();
  const { user, profile } = await requireUser();
  const first = (profile?.full_name ?? "").split(" ")[0];
  // No store/order tables exist yet (Phase 2+), so tiles show "—" rather than invented numbers.
  const tiles = [
    { label: t.dash.stores, icon: Store },
    { label: t.dash.products, icon: Package },
    { label: t.dash.orders, icon: ShoppingBag },
    { label: t.dash.customers, icon: Users },
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{t.dash.welcome}{first ? `, ${first}` : ""} 👋</h1>
        {user.email_confirmed_at && <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{t.dash.accountReady}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, icon: Icon }) => (
          <div key={label} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-100">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-navy-400">{label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span></div>
            <p className="mt-3 text-3xl font-black text-navy-900">—</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-navy-100 xl:col-span-2">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Store className="h-8 w-8" /></span>
          <h2 className="mt-4 text-lg font-bold">{t.dash.emptyStoresTitle}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-navy-400">{t.dash.emptyStoresBody}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-navy-100">
          <h2 className="flex items-center gap-2 font-bold"><BarChart3 className="h-5 w-5 text-brand-600" />{t.dash.analytics}</h2>
          <p className="mt-6 text-sm text-navy-400">{t.dash.noData}</p>
        </div>
      </div>
    </div>
  );
}
