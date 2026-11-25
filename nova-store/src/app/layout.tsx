import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import "./globals.css";

const sans = Heebo({ subsets: ["latin", "hebrew"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "NOVA STORE", template: "%s · NOVA STORE" },
  description: "NOVA STORE — create, design and run your own online stores.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#1f55eb" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir, t } = await getI18n();
  return (
    <html lang={locale} dir={dir} className={sans.variable}>
      <body className="min-h-screen font-sans">
        <I18nProvider locale={locale} t={t}>{children}</I18nProvider>
      </body>
    </html>
  );
}
