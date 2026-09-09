import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { practitionerController } from "@/modules/practitioners/practitioner.controller";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { ActiveBadge, humanizeEnum } from "@/components/status-badge";
import {
  NewPractitionerButton,
  PractitionerRowActions,
} from "@/components/practitioners/practitioner-actions";

export default async function PractitionersPage() {
  const ctx = await getActorContextFromSession();
  const practitioners = await practitionerController.list(ctx);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Clinic"
        title="Practitioners"
        description="The clinical team and the treatments each is qualified to deliver."
        action={<NewPractitionerButton />}
      />

      <div className="table-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Practitioner</TableHead>
              <TableHead>Specialties</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="w-10" aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {practitioners.length === 0 ? (
              <EmptyRow
                colSpan={4}
                title="No practitioners yet"
                hint="Add clinical staff before appointments can be assigned."
              />
            ) : (
              practitioners.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-surface font-heading text-[0.72rem] font-semibold text-rose ring-1 ring-rose-line/70"
                      >
                        {(p.firstName[0] ?? "").toUpperCase()}
                        {(p.lastName[0] ?? "").toUpperCase()}
                      </span>
                      <span>
                        {p.title ? `${p.title} ` : ""}
                        {p.firstName} {p.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap gap-1.5">
                      {p.specialties.length === 0 && (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {p.specialties.map((s) => (
                        <Badge key={s} variant="plum" tone="label">
                          {humanizeEnum(s)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ActiveBadge active={p.active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <PractitionerRowActions practitioner={p} />
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
