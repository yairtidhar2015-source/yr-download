import Link from "next/link";
import { BadgeCheck, KeyRound, ShieldAlert } from "lucide-react";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { buttonClass } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { t, locale } = await getI18n();
  const { user, profile } = await requireUser();
  const since = new Date(profile?.created_at ?? user.created_at).toLocaleDateString(locale, { dateStyle: "long" });
  return (
    <div className="max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-extrabold">{t.profile.title}</h1><p className="text-navy-400">{t.profile.subtitle}</p></div>
      <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-navy-100">
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          {user.email_confirmed_at
            ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700"><BadgeCheck className="h-4 w-4" />{t.profile.emailVerified}</span>
            : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700"><ShieldAlert className="h-4 w-4" />{t.profile.emailUnverified}</span>}
          <span className="text-navy-400">{t.profile.memberSince} {since}</span>
        </div>
        <ProfileForm fullName={profile?.full_name ?? ""} email={user.email ?? ""} />
      </section>
      <section className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-navy-100">
        <h2 className="flex items-center gap-2 font-bold"><KeyRound className="h-5 w-5 text-brand-600" />{t.profile.security}</h2>
        <Link href="/reset-password" className={buttonClass("secondary", "sm", "mt-4")}>{t.profile.changePassword}</Link>
      </section>
    </div>
  );
}
