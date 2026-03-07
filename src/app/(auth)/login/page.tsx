import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // Zaten giriş yapmış kullanıcıyı yönlendir
  const session = await auth();
  if (session?.user) {
    const { callbackUrl } = await searchParams;
    redirect(callbackUrl || "/");
  }

  return <LoginClient />;
}
