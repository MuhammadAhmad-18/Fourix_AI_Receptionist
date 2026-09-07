"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const formSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  source: z.enum([
    "REFERRAL",
    "WALK_IN",
    "WEBSITE",
    "WHATSAPP",
    "INSTAGRAM",
    "MESSENGER",
    "PHONE",
    "AI_AGENT",
    "OTHER",
  ]),
});
type FormValues = z.infer<typeof formSchema>;

async function createPatient(values: FormValues) {
  const res = await fetch("/api/v1/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Failed to create patient");
  return json.data;
}

export default function NewPatientPage() {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { gender: "UNSPECIFIED", source: "WALK_IN" },
  });

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: (patient) => {
      toast.success(`Patient ${patient.firstName} ${patient.lastName} created`);
      router.push("/patients");
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="page-shell max-w-2xl">
      <Link
        href="/patients"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All patients
      </Link>

      <PageHeader
        eyebrow="Clinic"
        title="Add a patient"
        description="Only a name is required — everything else can be filled in later."
      />

      <div className="table-surface">
        <div className="px-6 py-6">
          <form
            className="flex flex-col gap-5"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" {...form.register("firstName")} />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" {...form.register("lastName")} />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="03001234567" {...form.register("phone")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Gender</Label>
              <Select
                defaultValue="UNSPECIFIED"
                onValueChange={(v) => form.setValue("gender", v as FormValues["gender"])}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNSPECIFIED">Unspecified</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Source</Label>
              <Select
                defaultValue="WALK_IN"
                onValueChange={(v) => form.setValue("source", v as FormValues["source"])}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk-in</SelectItem>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                  <SelectItem value="PHONE">Phone</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="MESSENGER">Messenger</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-2 flex items-center gap-3 border-t border-border pt-5">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save patient"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={mutation.isPending}
                nativeButton={false} render={<Link href="/patients" />}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
