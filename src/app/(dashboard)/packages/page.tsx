import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { reportService } from "@/modules/reports/report.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, SectionHeader, EmptyRow } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

/** Sessions used out of the total, as a segmented track. */
function SessionMeter({ used, total }: { used: number; total: number }) {
  const safeTotal = Math.max(total, 1);
  const pct = Math.min(100, Math.round((used / safeTotal) * 100));
  const done = used >= total;
  return (
    <div className="flex items-center gap-2.5">
      <span data-numeric className="w-12 tabular-nums">
        {used} / {total}
      </span>
      <span
        aria-hidden
        className="h-1.5 w-24 overflow-hidden rounded-full bg-muted ring-1 ring-border/70"
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: done ? "var(--tone-plum)" : "var(--brand-accent)",
          }}
        />
      </span>
    </div>
  );
}

export default async function PackagesPage() {
  const ctx = await getActorContextFromSession();
  const [packages, memberships] = await Promise.all([
    reportService.listAllPackages(ctx),
    reportService.listAllMemberships(ctx),
  ]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Operations"
        title="Packages & memberships"
        description={`${packages.length} treatment packages · ${memberships.length} memberships`}
      />

      <section>
        <SectionHeader
          title="Treatment packages"
          description="Pre-paid session blocks and how much of each has been used."
        />
        <div className="table-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Sessions used</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.length === 0 ? (
                <EmptyRow
                  colSpan={4}
                  title="No packages sold"
                  hint="Package purchases will appear here once recorded."
                />
              ) : (
                packages.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.patient.firstName} {p.patient.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.service.name}
                    </TableCell>
                    <TableCell>
                      <SessionMeter used={p.usedSessions} total={p.totalSessions} />
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <SectionHeader
          title="Memberships"
          description="Recurring plans and their current standing."
        />
        <div className="table-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.length === 0 ? (
                <EmptyRow
                  colSpan={3}
                  title="No memberships yet"
                  hint="Enrolled patients will be listed here."
                />
              ) : (
                memberships.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.patient.firstName} {m.patient.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.planName}</TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={m.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
