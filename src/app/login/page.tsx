import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;

  async function authenticate(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const callbackUrl = (formData.get("callbackUrl") as string) || "/";

    try {
      await signIn("credentials", { email, password, redirectTo: callbackUrl });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=invalid&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
      throw err;
    }
  }

  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ---------- form, on warm ivory ---------- */}
      <div className="flex flex-col justify-between bg-background px-6 py-10 sm:px-12 lg:px-16 lg:py-14">
        <div className="flex items-baseline">
          <span className="font-heading text-[1.45rem] leading-none font-semibold tracking-[-0.015em]">
            Fourix
          </span>
          <span className="ml-1.5 text-[0.7rem] font-medium tracking-[0.22em] text-brass uppercase">
            Clinic
          </span>
        </div>

        <div className="rise mx-auto w-full max-w-sm py-14">
          <p className="page-eyebrow">Staff access</p>
          <h1 className="mt-2 font-heading text-[2.35rem] leading-[1.08] font-medium tracking-[-0.025em]">
            Welcome back.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in to manage appointments, patients and the day&rsquo;s revenue.
          </p>

          <div aria-hidden className="brass-rule mt-7 mb-7" />

          <form action={authenticate} className="flex flex-col gap-5">
            <input type="hidden" name="callbackUrl" value={params.callbackUrl ?? "/"} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-[0.8rem] font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@fourixclinic.com"
                required
                autoFocus
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-[0.8rem] font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="h-11"
              />
            </div>

            {params.error && (
              <p
                role="alert"
                className="rounded-lg border border-clay-line bg-clay-surface px-3 py-2 text-sm text-clay"
              >
                That email and password don&rsquo;t match. Please try again.
              </p>
            )}

            <Button type="submit" size="lg" className="mt-1 w-full">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground">
          Fourix Clinic Management &middot; Lahore
        </p>
      </div>

      {/* ---------- full-bleed hero ---------- */}
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <Image
          src="/login-hero.png"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[oklch(0.18_0.03_335/0.85)] via-[oklch(0.18_0.03_335/0.15)] to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 p-14">
          <div aria-hidden className="brass-rule mb-6 max-w-[7rem]" />
          <p className="font-heading text-[2.6rem] leading-[1.12] font-medium tracking-[-0.025em] text-[oklch(0.97_0.012_60)] text-balance">
            Considered care,
            <br />
            beautifully managed.
          </p>
          <p className="mt-4 max-w-sm text-sm text-[oklch(0.88_0.02_35)]">
            Appointments, patients, inventory and revenue — one calm workspace for
            the whole clinic.
          </p>
        </div>
      </div>
    </div>
  );
}
