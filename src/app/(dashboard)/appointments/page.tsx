import Link from "next/link";
import { Plus } from "lucide-react";
import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { reportService } from "@/modules/reports/report.service";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Karachi",
});
const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Karachi",
});

export default async function AppointmentsPage() {
  const ctx = await getActorContextFromSession();
  const appointments = await reportService.listAllAppointments(ctx);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Clinic"
        title="Appointments"
        description={`${appointments.length} appointment${appointments.length === 1 ? "" : "s"} in the schedule`}
        action={
          <Button nativeButton={false} render={<Link href="/appointments/new" />}>
            <Plus data-icon="inline-start" />
            New appointment
          </Button>
        }
      />

      <div className="table-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Practitioner</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <EmptyRow
                colSpan={5}
                title="Nothing booked yet"
                hint="Create the first appointment to populate the schedule."
              />
            ) : (
              appointments.map((a) => {
                const start = new Date(a.startTime);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.patient.firstName} {a.patient.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.practitioner.employee.firstName}{" "}
                      {a.practitioner.employee.lastName}
                    </TableCell>
                    <TableCell>{a.service.name}</TableCell>
                    <TableCell>
                      <span className="text-foreground">{DATE.format(start)}</span>
                      <span className="ml-2 text-muted-foreground">
                        {TIME.format(start)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={a.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
