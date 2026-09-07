import {
  CalendarCheck,
  CalendarClock,
  UserPlus,
  Banknote,
  TrendingUp,
  ReceiptText,
  PackageMinus,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { reportService } from "@/modules/reports/report.service";
import { PageHeader } from "@/components/page-header";
import { cn } from "cn";

type Tone = "rose" | "plum" | "sage" | "honey" | "clay" | "brass";

/** Full class strings so Tailwind can see every tone at build time. */
const TILE: Record<Tone, string> = {
  rose: "bg-rose-surface text-rose ring-rose-line/70",
  plum: "bg-plum-surface text-plum ring-plum-line/70",
  sage: "bg-sage-surface text-sage ring-sage-line/70",
  honey: "bg-honey-surface text-honey ring-honey-line/70",
  clay: "bg-clay-surface text-clay ring-clay-line/70",
  brass: "bg-brass-surface text-brass ring-brass/30",
};

function StatCard({
  label,
  value,
  prefix,
  hint,
  icon: Icon,
  tone,
  delay,
}: {
  label: string;
  value: string | number;
  prefix?: string;
  hint?: string;
  icon: LucideIcon;
  tone: Tone;
  delay: number;
}) {
  return (
    <article
      className="rise group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_-1px_oklch(0.29_0.057_338/0.06),0_12px_34px_-26px_oklch(0.29_0.057_338/0.5)] transition-shadow duration-300 hover:shadow-[0_1px_2px_-1px_oklch(0.29_0.057_338/0.08),0_16px_38px_-24px_oklch(0.29_0.057_338/0.55)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* thin brass rule across the top of every metric */}
      <span aria-hidden className="brass-rule absolute inset-x-0 top-0" />

      <div className="flex items-start justify-between gap-3">
        <h3 className="page-eyebrow min-h-[2.2rem] pt-0.5 leading-relaxed">{label}</h3>
        <span
          aria-hidden
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-[10px] ring-1 transition-transform duration-300 group-hover:-translate-y-0.5",
            TILE[tone]
          )}
        >
          <Icon className="size-[1.05rem]" />
        </span>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        {prefix && (
          <span className="text-[0.78rem] font-medium tracking-[0.08em] text-muted-foreground">
            {prefix}
          </span>
        )}
        <span
          data-numeric
          className="font-heading text-[clamp(1.55rem,2.1vw,2.1rem)] leading-none font-medium tracking-[-0.025em] text-foreground"
        >
          {value}
        </span>
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </article>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="page-eyebrow">{children}</h2>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await getActorContextFromSession();
  const stats = await reportService.getDashboardStats(ctx);

  const money = (n: number) => n.toLocaleString("en-PK");
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Fourix Clinic"
        title="Today at a glance"
        description={today}
      />

      <section>
        <GroupLabel>Schedule &amp; patients</GroupLabel>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
          <StatCard
            label="Today's appointments"
            value={stats.todaysAppointments}
            hint="Booked for the current clinic day"
            icon={CalendarCheck}
            tone="rose"
            delay={0}
          />
          <StatCard
            label="Upcoming appointments"
            value={stats.upcomingAppointments}
            hint="Confirmed beyond today"
            icon={CalendarClock}
            tone="plum"
            delay={60}
          />
          <StatCard
            label="New patients"
            value={stats.newPatientsThisMonth}
            hint="First visit recorded this month"
            icon={UserPlus}
            tone="sage"
            delay={120}
          />
        </div>
      </section>

      <section>
        <GroupLabel>Revenue</GroupLabel>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
          <StatCard
            label="Today's revenue"
            value={money(stats.todaysRevenue)}
            prefix="PKR"
            hint="Payments settled today"
            icon={Banknote}
            tone="sage"
            delay={0}
          />
          <StatCard
            label="Monthly revenue"
            value={money(stats.monthlyRevenue)}
            prefix="PKR"
            hint="Month to date"
            icon={TrendingUp}
            tone="brass"
            delay={60}
          />
          <StatCard
            label="Outstanding"
            value={money(stats.outstandingBalance)}
            prefix="PKR"
            hint="Unpaid invoice balance"
            icon={ReceiptText}
            tone="honey"
            delay={120}
          />
        </div>
      </section>

      <section>
        <GroupLabel>Stock</GroupLabel>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
          <StatCard
            label="Low stock products"
            value={stats.lowStockCount}
            hint="At or below reorder level"
            icon={PackageMinus}
            tone="clay"
            delay={0}
          />
          <StatCard
            label="Expiring products"
            value={stats.expiringCount}
            hint="Batches expiring within 30 days"
            icon={Hourglass}
            tone="honey"
            delay={60}
          />
        </div>
      </section>
    </div>
  );
}
