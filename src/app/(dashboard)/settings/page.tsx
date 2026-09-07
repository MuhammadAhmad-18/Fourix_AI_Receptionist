import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { clinicService } from "@/modules/clinic/clinic.service";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="table-surface">
      <div className="border-b border-border px-5 pt-4 pb-3.5">
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h2 className="mt-1 font-heading text-lg leading-tight font-medium tracking-[-0.015em]">
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

export default async function SettingsPage() {
  const ctx = await getActorContextFromSession();
  const [clinic, businessHours] = await Promise.all([
    clinicService.getClinicInformation(ctx),
    clinicService.getBusinessHours(ctx),
  ]);

  const hours = [...businessHours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="page-shell max-w-3xl">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Clinic identity, opening hours and the policies patients agree to."
      />

      <Panel eyebrow="Profile" title="Clinic information">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-2">
          <Field label="Name" value={clinic.name} />
          <Field label="Timezone" value={clinic.timezone} />
          <Field label="Phone" value={clinic.phone ?? "—"} />
          <Field label="Email" value={clinic.email ?? "—"} />
          <Field
            label="Address"
            value={[clinic.addressLine1, clinic.city].filter(Boolean).join(", ") || "—"}
          />
          <Field
            label="Currency"
            value={
              <Badge variant="honey" tone="label">
                {clinic.currency}
              </Badge>
            }
          />
        </dl>
      </Panel>

      <Panel eyebrow="Schedule" title="Business hours">
        <ul className="flex flex-col">
          {hours.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              No opening hours configured yet.
            </li>
          )}
          {hours.map((bh) => (
            <li
              key={bh.id}
              className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 last:border-b-0"
            >
              <span className="text-[0.92rem] font-medium">{DAY_NAMES[bh.dayOfWeek]}</span>
              {bh.isClosed ? (
                <Badge variant="stone" tone="label">
                  Closed
                </Badge>
              ) : (
                <span data-numeric className="text-[0.92rem] text-muted-foreground">
                  {bh.openTime} &ndash; {bh.closeTime}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel eyebrow="Policy" title="Cancellation policy">
        <p className="px-5 py-5 text-[0.92rem] leading-relaxed text-muted-foreground">
          {clinic.cancellationPolicy ?? "No cancellation policy has been set."}
        </p>
      </Panel>
    </div>
  );
}
