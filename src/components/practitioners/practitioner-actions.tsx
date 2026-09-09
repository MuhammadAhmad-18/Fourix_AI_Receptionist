"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { PractitionerOutput } from "@/modules/practitioners/practitioner.schema";

async function api<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Request failed");
  return json.data;
}

type FormState = {
  firstName: string;
  lastName: string;
  title: string;
  phone: string;
  email: string;
  specialties: string;
  bio: string;
  commissionRate: string;
};

function toForm(p?: PractitionerOutput): FormState {
  return {
    firstName: p?.firstName ?? "",
    lastName: p?.lastName ?? "",
    title: p?.title ?? "",
    phone: "",
    email: "",
    specialties: p?.specialties.join(", ") ?? "",
    bio: p?.bio ?? "",
    commissionRate: "",
  };
}

function PractitionerFormDialog({
  open,
  onOpenChange,
  practitioner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practitioner?: PractitionerOutput;
}) {
  const router = useRouter();
  const editing = Boolean(practitioner);
  const [form, setForm] = useState<FormState>(() => toForm(practitioner));
  const [pending, setPending] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setForm(toForm(practitioner));
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const valid = form.firstName.trim().length > 0 && form.lastName.trim().length > 0;

  async function submit() {
    setPending(true);
    try {
      const rate = form.commissionRate.trim();
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        title: form.title.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        specialties: form.specialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        bio: form.bio.trim() || undefined,
        commissionRate: rate ? Number(rate) : undefined,
      };
      const name = `${body.firstName} ${body.lastName}`;
      if (editing) {
        await api(`/api/v1/practitioners/${practitioner!.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast.success(`${name} updated`);
      } else {
        await api("/api/v1/practitioners", { method: "POST", body: JSON.stringify(body) });
        toast.success(`${name} added`);
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
          <DialogTitle>{editing ? "Edit practitioner" : "New practitioner"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the practitioner's details. Their treatment history is unaffected."
              : "Add clinical staff so appointments can be assigned to them."}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-1 flex max-h-[58vh] flex-col gap-4 overflow-y-auto px-1 py-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="prc-first">First name</Label>
              <Input
                id="prc-first"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Ayesha"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prc-last">Last name</Label>
              <Input
                id="prc-last"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Raza"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="prc-title">Title</Label>
            <Input
              id="prc-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Dr. / Aesthetician"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="prc-phone">Phone</Label>
              <Input
                id="prc-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder={editing ? "Leave blank to keep" : "03001234567"}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prc-email">Email</Label>
              <Input
                id="prc-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder={editing ? "Leave blank to keep" : "name@clinic.com"}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="prc-specialties">Specialties</Label>
            <Input
              id="prc-specialties"
              value={form.specialties}
              onChange={(e) => set("specialties", e.target.value)}
              placeholder="Injectables, Facials"
            />
            <p className="text-xs text-muted-foreground">Separate each with a comma.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="prc-rate">Commission rate (%)</Label>
            <Input
              id="prc-rate"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.commissionRate}
              onChange={(e) => set("commissionRate", e.target.value)}
              placeholder={editing ? "Leave blank to keep" : "10"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="prc-bio">Bio</Label>
            <Textarea
              id="prc-bio"
              rows={3}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Short professional summary."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Add practitioner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewPractitionerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        New practitioner
      </Button>
      <PractitionerFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function PractitionerRowActions({ practitioner }: { practitioner: PractitionerOutput }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const name = `${practitioner.firstName} ${practitioner.lastName}`;

  async function toggleActive() {
    setPending(true);
    try {
      await api(`/api/v1/practitioners/${practitioner.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !practitioner.active }),
      });
      toast.success(`${name} ${practitioner.active ? "deactivated" : "reactivated"}`);
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
      await api(`/api/v1/practitioners/${practitioner.id}`, { method: "DELETE" });
      toast.success(`${name} deleted`);
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message, { duration: 8000 });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`} />}
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
            {practitioner.active ? "Deactivate" : "Reactivate"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PractitionerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        practitioner={practitioner}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the practitioner and their staff record. It only works if
              they have no appointments, consultations, treatments or commissions — otherwise
              deactivate them instead to take them out of booking while keeping their history.
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
