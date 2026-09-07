"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type Option = { id: string; label: string };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Request failed");
  return json.data;
}

// Demo assumption: clinic timezone is Asia/Karachi (+05:00, no DST) — see
// prisma/seed.ts. A production form would resolve this from clinic settings
// rather than hardcoding the offset.
const CLINIC_OFFSET = "+05:00";

/** Quiet inline feedback while an option list loads or fails. */
function FieldStatus({
  loading,
  error,
  noun,
}: {
  loading: boolean;
  error: boolean;
  noun: string;
}) {
  if (error) return <p className="text-sm text-destructive">Could not load {noun}. Refresh to try again.</p>;
  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60" />
        Loading {noun}…
      </p>
    );
  return null;
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [practitionerId, setPractitionerId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const patients = useQuery({
    queryKey: ["patients"],
    queryFn: () => fetchJson<{ id: string; firstName: string; lastName: string }[]>("/api/v1/patients?limit=100"),
  });
  const practitioners = useQuery({
    queryKey: ["practitioners"],
    queryFn: () => fetchJson<{ id: string; firstName: string; lastName: string }[]>("/api/v1/practitioners"),
  });
  const services = useQuery({
    queryKey: ["services"],
    queryFn: () => fetchJson<{ id: string; name: string; durationMinutes: number }[]>("/api/v1/services?activeOnly=true"),
  });

  const startTime = date && time ? `${date}T${time}:00${CLINIC_OFFSET}` : "";

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ patientId, practitionerId, serviceId, startTime, source: "DASHBOARD" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed to book appointment");
      return json.data;
    },
    onSuccess: () => {
      toast.success("Appointment booked");
      router.push("/appointments");
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const patientOptions: Option[] = (patients.data ?? []).map((p) => ({ id: p.id, label: `${p.firstName} ${p.lastName}` }));
  const practitionerOptions: Option[] = (practitioners.data ?? []).map((p) => ({ id: p.id, label: `${p.firstName} ${p.lastName}` }));
  const serviceOptions: Option[] = (services.data ?? []).map((s) => ({ id: s.id, label: `${s.name} (${s.durationMinutes}m)` }));

  const canSubmit = patientId && practitionerId && serviceId && startTime && !mutation.isPending;

  return (
    <div className="page-shell max-w-2xl">
      <Link
        href="/appointments"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All appointments
      </Link>

      <PageHeader
        eyebrow="Clinic"
        title="New appointment"
        description="Pick the patient, who is treating them, and when."
      />

      <div className="table-surface">
        <div className="flex flex-col gap-5 px-6 py-6">
          <div className="flex flex-col gap-2">
            <Label>Patient</Label>
            <Select onValueChange={(v: unknown) => setPatientId((v as string) ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select patient">
                  {(v: unknown) => patientOptions.find((o) => o.id === v)?.label ?? "Select patient"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {patientOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FieldStatus loading={patients.isPending} error={patients.isError} noun="patients" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Practitioner</Label>
            <Select onValueChange={(v: unknown) => setPractitionerId((v as string) ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select practitioner">
                  {(v: unknown) => practitionerOptions.find((o) => o.id === v)?.label ?? "Select practitioner"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {practitionerOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FieldStatus loading={practitioners.isPending} error={practitioners.isError} noun="practitioners" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Service</Label>
            <Select onValueChange={(v: unknown) => setServiceId((v as string) ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select service">
                  {(v: unknown) => serviceOptions.find((o) => o.id === v)?.label ?? "Select service"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {serviceOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <FieldStatus loading={services.isPending} error={services.isError} noun="services" />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3 border-t border-border pt-5">
            <Button disabled={!canSubmit} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Booking…" : "Book appointment"}
            </Button>
            <Button
              variant="ghost"
              disabled={mutation.isPending}
              nativeButton={false} render={<Link href="/appointments" />}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
