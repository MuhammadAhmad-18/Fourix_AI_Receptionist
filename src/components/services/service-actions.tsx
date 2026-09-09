"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ServiceOutput } from "@/modules/services/service.schema";

async function api<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Request failed");
  return json.data;
}

type FormState = {
  name: string;
  durationMinutes: string;
  price: string;
  description: string;
  requiresConsultation: boolean;
  requiresConsent: boolean;
  preparationInstructions: string;
  aftercareInstructions: string;
};

function toForm(s?: ServiceOutput): FormState {
  return {
    name: s?.name ?? "",
    durationMinutes: s ? String(s.durationMinutes) : "30",
    price: s ? String(s.price) : "",
    description: s?.description ?? "",
    requiresConsultation: s?.requiresConsultation ?? false,
    requiresConsent: s?.requiresConsent ?? false,
    preparationInstructions: s?.preparationInstructions ?? "",
    aftercareInstructions: s?.aftercareInstructions ?? "",
  };
}

function ServiceFormDialog({
  open,
  onOpenChange,
  service,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceOutput;
}) {
  const router = useRouter();
  const editing = Boolean(service);
  const [form, setForm] = useState<FormState>(() => toForm(service));
  const [pending, setPending] = useState(false);

  // Re-seed whenever the dialog is opened so a cancelled edit doesn't persist.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setForm(toForm(service));
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const duration = Number(form.durationMinutes);
  const price = Number(form.price);
  const valid =
    form.name.trim().length > 0 &&
    Number.isFinite(duration) &&
    duration >= 5 &&
    Number.isFinite(price) &&
    price >= 0;

  async function submit() {
    setPending(true);
    try {
      const body = {
        name: form.name.trim(),
        durationMinutes: duration,
        price,
        description: form.description.trim() || undefined,
        requiresConsultation: form.requiresConsultation,
        requiresConsent: form.requiresConsent,
        preparationInstructions: form.preparationInstructions.trim() || undefined,
        aftercareInstructions: form.aftercareInstructions.trim() || undefined,
      };
      if (editing) {
        await api(`/api/v1/services/${service!.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast.success(`${body.name} updated`);
      } else {
        await api("/api/v1/services", { method: "POST", body: JSON.stringify(body) });
        toast.success(`${body.name} added`);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit service" : "New service"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes apply to future bookings; past appointments keep the details they were booked with."
              : "Add a treatment so it can be booked, scheduled and invoiced."}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex max-h-[58vh] flex-col gap-4 overflow-y-auto px-1 py-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="svc-name">Name</Label>
            <Input
              id="svc-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Hydrafacial"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="svc-duration">Duration (minutes)</Label>
              <Input
                id="svc-duration"
                type="number"
                min={5}
                step={5}
                value={form.durationMinutes}
                onChange={(e) => set("durationMinutes", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="svc-price">Price (PKR)</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step={100}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="8000"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="svc-description">Description</Label>
            <Textarea
              id="svc-description"
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What the treatment involves."
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">Requires consultation</span>
                <span className="block text-xs text-muted-foreground">
                  Patient must be seen before this can be delivered.
                </span>
              </span>
              <Switch
                checked={form.requiresConsultation}
                onCheckedChange={(v: boolean) => set("requiresConsultation", v)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">Requires consent</span>
                <span className="block text-xs text-muted-foreground">
                  A signed consent record is expected on file.
                </span>
              </span>
              <Switch
                checked={form.requiresConsent}
                onCheckedChange={(v: boolean) => set("requiresConsent", v)}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="svc-prep">Preparation instructions</Label>
            <Textarea
              id="svc-prep"
              rows={2}
              value={form.preparationInstructions}
              onChange={(e) => set("preparationInstructions", e.target.value)}
              placeholder="What the patient should do beforehand."
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="svc-after">Aftercare instructions</Label>
            <Textarea
              id="svc-after"
              rows={2}
              value={form.aftercareInstructions}
              onChange={(e) => set("aftercareInstructions", e.target.value)}
              placeholder="What the patient should do afterwards."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Add service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewServiceButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        New service
      </Button>
      <ServiceFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ServiceRowActions({ service }: { service: ServiceOutput }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function toggleActive() {
    setPending(true);
    try {
      await api(`/api/v1/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !service.active }),
      });
      toast.success(`${service.name} ${service.active ? "deactivated" : "reactivated"}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await api(`/api/v1/services/${service.id}`, { method: "DELETE" });
      toast.success(`${service.name} deleted`);
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      // In-use services can't be deleted — the message explains what blocks it.
      toast.error((err as Error).message, { duration: 8000 });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${service.name}`} />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleActive} disabled={pending}>
            <Power />
            {service.active ? "Deactivate" : "Reactivate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ServiceFormDialog open={editOpen} onOpenChange={setEditOpen} service={service} />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {service.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the service. It only works if the service has never been
              booked, treated, packaged or invoiced — otherwise deactivate it instead to stop
              offering it while keeping its history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
