import { LoginForm } from "@/components/auth/auth-forms";
import { safeNext } from "@/lib/utils";

export const metadata = { title: "Login" };

const errorMap = { not_configured: "notConfigured", link_invalid: "linkInvalid" } as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const initialError = error && error in errorMap ? errorMap[error as keyof typeof errorMap] : undefined;
  return <LoginForm next={safeNext(next)} initialError={initialError} />;
}
