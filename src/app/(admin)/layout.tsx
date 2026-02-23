import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";

export const metadata = {
  title: "ADJY Admin Panel",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Giriş yapmamışsa login'e yönlendir
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  // DB'den rol kontrolü (JWT'deki role manipüle edilmiş olabilir)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <div className="flex min-h-screen">
          <AdminSidebar />
          <main className="flex-1 bg-background">
            <div className="p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </ThemeProvider>
    </SessionProvider>
  );
}
