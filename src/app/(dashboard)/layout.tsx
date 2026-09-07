import Link from "next/link";
import { LogOut } from "lucide-react";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SidebarNav, MobileNav } from "@/components/sidebar-nav";

function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={className}>
      <span className="font-heading text-[1.35rem] leading-none font-semibold tracking-[-0.015em] text-sidebar-accent-foreground">
        Fourix
      </span>
      <span className="ml-1.5 text-[0.68rem] font-medium tracking-[0.22em] text-sidebar-primary uppercase">
        Clinic
      </span>
    </Link>
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "Signed in";
  const email = session?.user?.email ?? "";
  const initials =
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "F";

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      {/* --- mobile masthead ------------------------------------------- */}
      <header className="grain relative z-20 shrink-0 bg-sidebar lg:hidden">
        <div className="flex items-center justify-between px-4 py-3.5">
          <Wordmark className="flex items-baseline" />
          <form action={handleSignOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              className="text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut />
            </Button>
          </form>
        </div>
        <MobileNav />
      </header>

      {/* --- the plum anchor -------------------------------------------- */}
      <aside className="grain sticky top-0 z-20 hidden h-screen w-[16.5rem] shrink-0 flex-col bg-sidebar lg:flex">
        <div className="relative z-10 flex h-[4.5rem] shrink-0 items-center px-6">
          <Wordmark className="flex items-baseline" />
        </div>
        <div
          aria-hidden
          className="relative z-10 mx-6 h-px shrink-0 bg-gradient-to-r from-sidebar-primary/45 via-sidebar-border to-transparent"
        />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <SidebarNav />
        </div>

        <div className="relative z-10 shrink-0 border-t border-sidebar-border/70 p-4">
          <div className="flex items-center gap-3 px-1.5 py-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent font-heading text-[0.8rem] font-semibold text-sidebar-primary ring-1 ring-sidebar-primary/25">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.83rem] font-medium text-sidebar-foreground">
                {name}
              </div>
              {email && (
                <div className="truncate text-[0.72rem] text-sidebar-muted">{email}</div>
              )}
            </div>
          </div>
          <form action={handleSignOut} className="mt-2">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
