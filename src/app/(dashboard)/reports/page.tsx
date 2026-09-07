import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { reportService } from "@/modules/reports/report.service";
import { PageHeader } from "@/components/page-header";

/** A ranked list where the bar is the row — no chart library, no chrome. */
function RankedList({
  rows,
  emptyTitle,
  emptyHint,
  unit,
  accent,
}: {
  rows: { id: string; name: string; value: number }[];
  emptyTitle: string;
  emptyHint: string;
  unit: string;
  accent: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 px-4 py-12 text-center">
        <span className="font-heading text-base text-foreground/70">{emptyTitle}</span>
        <span className="text-sm text-muted-foreground">{emptyHint}</span>
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => (
        <li
          key={row.id}
          className="flex items-center gap-4 border-b border-border/70 px-5 py-3.5 last:border-b-0"
        >
          <span
            data-numeric
            className="w-5 shrink-0 font-heading text-[0.85rem] text-muted-foreground"
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-[0.9rem] font-medium">
            {row.name}
          </span>
          <span
            aria-hidden
            className="hidden h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/70 sm:block"
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.max(4, Math.round((row.value / max) * 100))}%`,
                background: accent,
              }}
            />
          </span>
          <span data-numeric className="w-20 shrink-0 text-right text-[0.9rem]">
            {row.value}
            <span className="ml-1 text-[0.7rem] text-muted-foreground">{unit}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function ReportCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="table-surface">
      <div className="border-b border-border px-5 pt-4 pb-3.5">
        <p className="page-eyebrow">{eyebrow}</p>
        <h2 className="mt-1 font-heading text-lg leading-tight font-medium tracking-[-0.015em]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default async function ReportsPage() {
  const ctx = await getActorContextFromSession();
  const [performance, popular] = await Promise.all([
    reportService.getPractitionerPerformance(ctx, 30),
    reportService.getPopularServices(ctx, 30),
  ]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Business"
        title="Reports"
        description="Rolling 30-day view of who is delivering treatments and what patients are booking."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportCard eyebrow="Last 30 days" title="Practitioner performance">
          <RankedList
            rows={performance.map((p) => ({
              id: p.practitionerId,
              name: p.name,
              value: p.treatmentsCompleted,
            }))}
            unit="done"
            accent="var(--brand-accent)"
            emptyTitle="No treatments completed"
            emptyHint="Completed appointments in the last 30 days will rank here."
          />
        </ReportCard>

        <ReportCard eyebrow="Last 30 days" title="Popular services">
          <RankedList
            rows={popular.map((s) => ({
              id: s.serviceId,
              name: s.name,
              value: s.bookings,
            }))}
            unit="booked"
            accent="var(--brass)"
            emptyTitle="No bookings yet"
            emptyHint="Services booked in the last 30 days will rank here."
          />
        </ReportCard>
      </div>
    </div>
  );
}
