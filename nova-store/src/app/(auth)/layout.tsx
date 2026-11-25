import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-brand-50 to-white">
      <div className="bg-grid absolute inset-0 -z-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="NOVA STORE"><Logo /></Link>
        <LanguageSwitcher />
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center">
        <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white p-7 shadow-[0_30px_80px_-30px_rgba(11,18,38,.3)] ring-1 ring-navy-100 sm:p-9">{children}</div>
      </main>
    </div>
  );
}
