import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { reportService } from "@/modules/reports/report.service";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

function Money({ value, dim }: { value: number; dim?: boolean }) {
  return (
    <span data-numeric className={dim ? "text-muted-foreground" : undefined}>
      {value.toLocaleString("en-PK")}
    </span>
  );
}

export default async function FinancePage() {
  const ctx = await getActorContextFromSession();
  const invoices = await reportService.listAllInvoices(ctx);

  const totals = invoices.reduce(
    (acc, inv) => {
      const total = Number(inv.total);
      const paid = Number(inv.amountPaid);
      acc.total += total;
      acc.paid += paid;
      acc.balance += total - paid;
      return acc;
    },
    { total: 0, paid: 0, balance: 0 }
  );

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Business"
        title="Finance"
        description={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"} · PKR ${totals.balance.toLocaleString("en-PK")} outstanding`}
      />

      <div className="table-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead className="text-right">Total (PKR)</TableHead>
              <TableHead className="text-right">Paid (PKR)</TableHead>
              <TableHead className="text-right">Balance (PKR)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Issued</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <EmptyRow
                colSpan={6}
                title="No invoices yet"
                hint="Invoices raised against treatments will be listed here."
              />
            ) : (
              invoices.map((inv) => {
                const balance = Number(inv.total) - Number(inv.amountPaid);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.patient.firstName} {inv.patient.lastName}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={Number(inv.total)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={Number(inv.amountPaid)} dim />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={balance > 0 ? "font-medium text-clay" : undefined}>
                        <Money value={balance} dim={balance === 0} />
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {inv.issuedAt
                        ? new Date(inv.issuedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {invoices.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="text-[0.7rem] font-medium tracking-[0.09em] text-muted-foreground uppercase">
                  Total
                </TableCell>
                <TableCell className="text-right">
                  <Money value={totals.total} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={totals.paid} />
                </TableCell>
                <TableCell className="text-right font-medium text-clay">
                  <Money value={totals.balance} />
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
