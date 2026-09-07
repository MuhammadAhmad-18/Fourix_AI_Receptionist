import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { reportService } from "@/modules/reports/report.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActiveBadge, humanizeEnum } from "@/components/status-badge";

/** Roles read faster when leadership, clinical and support are tinted apart. */
const ROLE_VARIANT: Record<string, "plum" | "rose" | "sage" | "honey" | "stone"> = {
  ADMIN: "plum",
  MANAGER: "plum",
  PRACTITIONER: "rose",
  RECEPTIONIST: "sage",
  ASSISTANT: "sage",
  ACCOUNTANT: "honey",
};

export default async function EmployeesPage() {
  const ctx = await getActorContextFromSession();
  const employees = await reportService.listAllEmployees(ctx);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Business"
        title="Employees"
        description={`${employees.length} team member${employees.length === 1 ? "" : "s"} on record`}
      />

      <div className="table-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <EmptyRow
                colSpan={5}
                title="No employees yet"
                hint="Team members added to the clinic will appear here."
              />
            ) : (
              employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-stone-surface font-heading text-[0.72rem] font-semibold text-stone ring-1 ring-stone-line"
                      >
                        {(e.firstName[0] ?? "").toUpperCase()}
                        {(e.lastName[0] ?? "").toUpperCase()}
                      </span>
                      <span>
                        {e.firstName} {e.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ROLE_VARIANT[e.role] ?? "stone"} tone="label">
                      {humanizeEnum(e.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.phoneRaw ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <ActiveBadge active={e.active} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
