import { SiteHeader } from "@/components/landing/site-header";
import { CtaBand, Faq, Features, Footer, Hero, HowItWorks, Pricing } from "@/components/landing/sections";
import { getI18n } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const { t } = await getI18n();
  const user = isSupabaseConfigured ? await getUser() : null;
  return (
    <>
      <SiteHeader signedIn={!!user} />
      <main>
        <Hero t={t} />
        <Features t={t} />
        <HowItWorks t={t} />
        <Pricing t={t} />
        <Faq t={t} />
        <CtaBand t={t} />
      </main>
      <Footer t={t} />
    </>
  );
}
