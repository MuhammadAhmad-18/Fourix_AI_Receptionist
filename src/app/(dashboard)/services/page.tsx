import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { serviceController } from "@/modules/services/service.controller";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActiveBadge } from "@/components/status-badge";

export default async function ServicesPage() {
  const ctx = await getActorContextFromSession();
  const services = await serviceController.list(ctx);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Clinic"
        title="Services"
        description="Treatments offered, with duration, price and pre-treatment requirements."
      />

      <div className="table-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Price (PKR)</TableHead>
              <TableHead>Requires</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <EmptyRow
                colSpan={5}
                title="No services configured"
                hint="Add treatments so they can be booked and invoiced."
              />
            ) : (
              services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {s.durationMinutes} min
                  </TableCell>
                  <TableCell data-numeric className="text-right">
                    {s.price.toLocaleString("en-PK")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {s.requiresConsultation && (
                        <Badge variant="honey" tone="label">
                          Consultation
                        </Badge>
                      )}
                      {s.requiresConsent && (
                        <Badge variant="rose" tone="label">
                          Consent
                        </Badge>
                      )}
                      {!s.requiresConsultation && !s.requiresConsent && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ActiveBadge active={s.active} />
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
