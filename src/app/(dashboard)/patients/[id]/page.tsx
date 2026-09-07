import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { patientController } from "@/modules/patients/patient.controller";
import { AppError } from "@/lib/errors/codes";
import { Badge } from "@/components/ui/badge";
import { humanizeEnum, titleCaseEnum } from "@/components/status-badge";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="table-surface">
      <div className="border-b border-border px-5 pt-4 pb-3.5">
        <h2 className="font-heading text-lg leading-tight font-medium tracking-[-0.015em]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="page-eyebrow">{label}</dt>
      <dd className="text-[0.92rem]">{value}</dd>
    </div>
  );
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getActorContextFromSession();

  let patient;
  try {
    patient = await patientController.get(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "PATIENT_NOT_FOUND") notFound();
    throw err;
  }

  const initials =
    `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="page-shell max-w-3xl">
      <div className="flex flex-col gap-5">
        <Link
          href="/patients"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All patients
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-full bg-plum-surface font-heading text-lg font-semibold text-plum ring-1 ring-plum-line"
          >
            {initials}
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="page-title">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="stone" tone="label">
                {humanizeEnum(patient.source)}
              </Badge>
              {patient.city && (
                <span className="text-sm text-muted-foreground">{patient.city}</span>
              )}
            </div>
          </div>
        </div>
        <div className="brass-rule" />
      </div>

      <Panel title="Contact">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-2">
          <Field label="Phone" value={patient.phoneE164 ?? "—"} />
          <Field label="Email" value={patient.email ?? "—"} />
          <Field label="City" value={patient.city ?? "—"} />
          <Field label="Gender" value={titleCaseEnum(patient.gender)} />
        </dl>
      </Panel>

      <Panel title="Notes">
        <p className="px-5 py-5 text-[0.92rem] leading-relaxed text-muted-foreground">
          {patient.notes || "No notes recorded for this patient yet."}
        </p>
      </Panel>
    </div>
  );
}
