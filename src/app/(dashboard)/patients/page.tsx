import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { patientController } from "@/modules/patients/patient.controller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyRow } from "@/components/page-header";
import { humanizeEnum } from "@/components/status-badge";

function Initials({ first, last }: { first: string; last: string }) {
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full bg-plum-surface font-heading text-[0.72rem] font-semibold text-plum ring-1 ring-plum-line/70"
    >
      {(first[0] ?? "").toUpperCase()}
      {(last[0] ?? "").toUpperCase()}
    </span>
  );
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await getActorContextFromSession();
  const patients = await patientController.list(ctx, { q, limit: 50 });

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Clinic"
        title="Patients"
        description={
          q
            ? `${patients.length} result${patients.length === 1 ? "" : "s"} for “${q}”`
            : `${patients.length} patient${patients.length === 1 ? "" : "s"} on file`
        }
        action={
          <Button nativeButton={false} render={<Link href="/patients/new" />}>
            <Plus data-icon="inline-start" />
            Add patient
          </Button>
        }
      />

      <form className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search by name…"
            aria-label="Search patients by name"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {q && (
          <Button variant="ghost" nativeButton={false} render={<Link href="/patients" />}>
            Clear
          </Button>
        )}
      </form>

      <div className="table-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <EmptyRow
                colSpan={5}
                title={q ? "No matching patients" : "No patients yet"}
                hint={
                  q
                    ? "Try a shorter search, or clear the filter to see everyone."
                    : "Add your first patient to start booking appointments."
                }
              />
            ) : (
              patients.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/patients/${p.id}`}
                      className="flex items-center gap-3 rounded-md underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                    >
                      <Initials first={p.firstName} last={p.lastName} />
                      {p.firstName} {p.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.phoneE164 ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="stone" tone="label">
                      {humanizeEnum(p.source)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
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
