import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          {/* Desktop Sidebar */}
          <div className="hidden md:flex">
            <AdminSidebar />
          </div>

          <main className="flex-1 bg-background max-w-full overflow-x-hidden">
            {/* Mobile Header with Hamburger Menu */}
            <div className="md:hidden flex items-center p-4 border-b border-border/40 bg-card">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="w-5 h-5" />
                    <span className="sr-only">Toggle Admin Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  <AdminSidebar />
                </SheetContent>
              </Sheet>
              <div className="ml-4 font-bold font-[var(--font-orbitron)] tracking-wider">
                ADJY Admin
              </div>
            </div>

            <div className="p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-auto">{children}</div>
          </main>
        </div>
      </ThemeProvider>
    </SessionProvider>
  );
}
