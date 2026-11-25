"use client";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div><p className="text-lg font-semibold text-navy-900">{t.errors.generic}</p><Button className="mt-6" onClick={reset}>↻</Button></div>
    </div>
  );
}
