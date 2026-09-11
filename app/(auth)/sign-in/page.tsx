import { AuthForm } from "@/components/auth/auth-form";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; recovery?: string }> }) {
  const { next, error, recovery } = await searchParams;
  return <AuthForm mode="sign-in" nextPath={next} oauthError={error} recoveryOpen={recovery === "1"} />;
}
