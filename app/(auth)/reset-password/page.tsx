import { AuthForm } from "@/components/auth/auth-form";
import Link from "next/link";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  if (!token || error) return <div className="auth-card auth-card--complete"><p className="auth-eyebrow">Password recovery</p><h1>Reset link expired</h1><p>This link is invalid, expired, or has already been used.</p><Link className="button button--primary" href="/sign-in?recovery=1">Request a new link</Link></div>;
  return <AuthForm mode="reset" resetToken={token} />;
}
