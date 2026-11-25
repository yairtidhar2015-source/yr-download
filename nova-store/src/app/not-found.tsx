import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { buttonClass } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="grid min-h-screen place-items-center bg-sky-25 px-4 text-center">
      <div><Logo /><p className="mt-8 text-7xl font-black text-brand-600">404</p>
        <Link href="/" className={buttonClass("primary", "md", "mt-8")}>{t.common.backHome}</Link></div>
    </div>
  );
}
