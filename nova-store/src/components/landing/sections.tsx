import Link from "next/link";
import { ArrowRight, Check, ChevronDown, LayoutTemplate, Package, Palette, ShieldCheck, Store, Truck, Users, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/ui/logo";
import type { Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";

const featureIcons = [Store, Palette, Package, Users, Truck, ShieldCheck];

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-lg text-navy-400">{subtitle}</p>}
    </div>
  );
}

export function Hero({ t }: { t: Dictionary }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-sky-25 to-white" />
      <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="absolute -top-32 start-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-300/30 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-24">
        <div className="animate-fade-up text-center lg:text-start">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-brand-700 shadow-card ring-1 ring-brand-100">
            <Sparkles className="h-4 w-4" /> {t.hero.badge}
          </span>
          <h1 className="mt-6 text-4xl font-black leading-[1.1] tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
            {t.hero.title}<br /><span className="text-gradient">{t.hero.titleAccent}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-navy-400 lg:mx-0">{t.hero.subtitle}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/register" className={buttonClass("primary", "lg")}>
              {t.hero.cta} <ArrowRight className="flip-rtl h-5 w-5" />
            </Link>
            <Link href="/login" className={buttonClass("secondary", "lg")}>{t.hero.secondary}</Link>
          </div>
          <p className="mt-6 text-sm text-navy-400">{t.hero.trust}</p>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/** Decorative product illustration — intentionally shows no numbers, so nothing reads as real data. */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg animate-fade-up [animation-delay:150ms]" aria-hidden="true">
      <div className="rounded-3xl bg-white p-3 shadow-[0_30px_80px_-20px_rgba(11,18,38,.25)] ring-1 ring-navy-100">
        <div className="flex items-center gap-1.5 px-2 pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ms-3 h-5 flex-1 rounded-md bg-navy-50" />
        </div>
        <div className="grid grid-cols-[72px_1fr] gap-3 rounded-2xl bg-sky-25 p-3">
          <div className="space-y-2 rounded-xl bg-white p-2">
            <LogoMark className="mx-auto h-7 w-7" />
            {[...Array(5)].map((_, i) => <div key={i} className={cn("h-2.5 rounded", i === 1 ? "bg-brand-200" : "bg-navy-50")} />)}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl bg-white p-2.5">
                  <div className="h-2 w-10 rounded bg-navy-100" />
                  <div className="mt-2 h-4 w-14 rounded bg-brand-100" />
                </div>
              ))}
            </div>
            <div className="flex h-32 items-end gap-1.5 rounded-xl bg-white p-3">
              {[35, 50, 42, 65, 58, 78, 70, 90, 84, 96].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand-500 to-brand-300" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl bg-white p-2">
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-brand-100 to-brand-50" />
                  <div className="mt-2 h-2 rounded bg-navy-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-6 -start-6 hidden animate-float items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-navy-100 sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Check className="h-5 w-5" /></span>
        <div className="space-y-1.5"><div className="h-2 w-20 rounded bg-navy-100" /><div className="h-2 w-12 rounded bg-navy-50" /></div>
      </div>
      <div className="absolute -end-4 -top-5 hidden animate-float items-center gap-2 rounded-2xl bg-white p-3 shadow-card ring-1 ring-navy-100 [animation-delay:1.5s] sm:flex">
        <LayoutTemplate className="h-5 w-5 text-brand-600" /><div className="h-2 w-16 rounded bg-brand-100" />
      </div>
    </div>
  );
}

export function Features({ t }: { t: Dictionary }) {
  return (
    <section id="features" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle title={t.features.title} subtitle={t.features.subtitle} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((f, i) => {
            const Icon = featureIcons[i % featureIcons.length];
            return (
              <div key={f.title} className="group rounded-2xl bg-white p-6 shadow-card ring-1 ring-navy-100 transition hover:-translate-y-1 hover:ring-brand-200">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-lg font-bold text-navy-900">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-navy-400">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks({ t }: { t: Dictionary }) {
  return (
    <section id="how" className="scroll-mt-20 bg-sky-25 py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionTitle title={t.how.title} />
        <ol className="grid gap-6 md:grid-cols-3">
          {t.how.steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl bg-white p-7 text-center shadow-card ring-1 ring-navy-100">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-black text-white shadow-glow">{i + 1}</span>
              <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-navy-400">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Pricing({ t }: { t: Dictionary }) {
  return (
    <section id="pricing" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionTitle title={t.pricing.title} subtitle={t.pricing.subtitle} />
        <div className="grid gap-6 lg:grid-cols-3">
          {t.pricing.plans.map((p, i) => {
            const featured = i === 1;
            return (
              <div key={p.name} className={cn("relative flex flex-col rounded-3xl p-7 ring-1", featured ? "bg-navy-900 text-white ring-navy-900 shadow-[0_30px_60px_-20px_rgba(31,85,235,.5)] lg:-translate-y-3" : "bg-white ring-navy-100 shadow-card")}>
                {featured && <span className="absolute -top-3 start-7 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">{t.pricing.popular}</span>}
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className={cn("mt-1 text-sm", featured ? "text-navy-100" : "text-navy-400")}>{p.desc}</p>
                <p className="mt-6"><span className="text-4xl font-black" dir="ltr">{p.price}</span><span className={featured ? "text-navy-100" : "text-navy-400"}>{p.period}</span></p>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm"><Check className={cn("h-4 w-4 shrink-0", featured ? "text-brand-300" : "text-brand-600")} />{f}</li>
                  ))}
                </ul>
                <Link href="/register" className={cn(buttonClass(featured ? "primary" : "secondary"), "mt-8 w-full")}>{p.cta}</Link>
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-8 max-w-2xl rounded-xl bg-brand-50 px-4 py-3 text-center text-sm text-brand-800">{t.pricing.devNote}</p>
      </div>
    </section>
  );
}

export function Faq({ t }: { t: Dictionary }) {
  return (
    <section id="faq" className="scroll-mt-20 bg-sky-25 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionTitle title={t.faq.title} />
        <div className="space-y-3">
          {t.faq.items.map((item) => (
            <details key={item.q} className="group rounded-2xl bg-white p-5 shadow-card ring-1 ring-navy-100 open:ring-brand-200">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy-900">
                {item.q}<ChevronDown className="h-5 w-5 shrink-0 text-navy-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 leading-relaxed text-navy-400">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBand({ t }: { t: Dictionary }) {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-navy-900 px-6 py-14 text-center text-white">
        <div className="bg-grid absolute inset-0 opacity-30" />
        <h2 className="relative text-3xl font-extrabold sm:text-4xl">{t.hero.title} {t.hero.titleAccent}</h2>
        <Link href="/register" className={cn(buttonClass("secondary", "lg"), "relative mt-8")}>{t.hero.cta}</Link>
      </div>
    </section>
  );
}

export function Footer({ t }: { t: Dictionary }) {
  const cols = [
    { title: t.footer.product, links: [[t.nav.features, "#features"], [t.nav.pricing, "#pricing"], [t.nav.faq, "#faq"]] },
    { title: t.footer.company, links: [[t.footer.about, "#"], [t.footer.contact, "#"]] },
    { title: t.footer.legal, links: [[t.footer.privacy, "#"], [t.footer.terms, "#"]] },
  ];
  return (
    <footer className="border-t border-navy-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div><Logo /><p className="mt-4 max-w-xs text-sm text-navy-400">{t.footer.tagline}</p></div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-bold text-navy-900">{c.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([label, href]) => <li key={label}><a href={href} className="text-sm text-navy-400 hover:text-brand-700">{label}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-navy-100 py-6 text-center text-sm text-navy-400">© {new Date().getFullYear()} NOVA STORE. {t.footer.rights}</div>
    </footer>
  );
}
