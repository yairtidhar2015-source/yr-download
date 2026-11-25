"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { buttonClass } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#features", label: t.nav.features },
    { href: "#how", label: t.nav.how },
    { href: "#pricing", label: t.nav.pricing },
    { href: "#faq", label: t.nav.faq },
  ];

  return (
    <header className={cn("sticky top-0 z-40 transition-all", scrolled ? "bg-white/85 shadow-card backdrop-blur-lg" : "bg-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="NOVA STORE"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-navy-500 transition hover:text-brand-700">{l.label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          {signedIn ? (
            <Link href="/dashboard" className={buttonClass("primary", "sm")}>{t.common.dashboard}</Link>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost", "sm")}>{t.common.login}</Link>
              <Link href="/register" className={buttonClass("primary", "sm")}>{t.hero.cta}</Link>
            </>
          )}
        </div>
        <button className="rounded-lg p-2 text-navy-700 lg:hidden" onClick={() => setOpen(!open)} aria-label={t.common.menu} aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="border-t border-navy-100 bg-white px-4 pb-5 pt-2 lg:hidden">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3 font-medium text-navy-700">{l.label}</a>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            <LanguageSwitcher />
            {signedIn ? (
              <Link href="/dashboard" className={buttonClass("primary")}>{t.common.dashboard}</Link>
            ) : (
              <>
                <Link href="/login" className={buttonClass("secondary")}>{t.common.login}</Link>
                <Link href="/register" className={buttonClass("primary")}>{t.hero.cta}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
