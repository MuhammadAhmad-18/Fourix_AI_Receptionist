import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

type Tone = "sage" | "honey" | "clay" | "rose" | "plum" | "stone";

/**
 * One tone map for every enum in the app, so a CONFIRMED appointment and a
 * PAID invoice speak the same visual language wherever they appear.
 *
 * Presentation only — the raw enum value is still the source of truth.
 */
const TONES: Record<string, Tone> = {
  // appointments
  REQUESTED: "honey",
  CONFIRMED: "sage",
  CHECKED_IN: "rose",
  IN_PROGRESS: "rose",
  COMPLETED: "plum",
  CANCELLED: "clay",
  NO_SHOW: "clay",

  // invoices / payments
  DRAFT: "stone",
  ISSUED: "plum",
  PARTIALLY_PAID: "honey",
  PAID: "sage",
  VOID: "clay",
  PENDING: "honey",
  FAILED: "clay",
  REFUNDED: "stone",

  // packages / memberships / clients
  ACTIVE: "sage",
  EXPIRED: "stone",
  SUSPENDED: "honey",
  DISABLED: "stone",
  INACTIVE: "stone",

  // notifications
  SENT: "sage",
  READ: "stone",
};

export function humanizeEnum(value: string) {
  return value.replace(/_/g, " ");
}

/** "WALK_IN" -> "Walk in" — for prose fields, not the uppercase badges. */
export function titleCaseEnum(value: string) {
  const words = value.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function toneFor(value: string): Tone {
  return TONES[value] ?? "stone";
}

/** A tinted, uppercase micro-label for any enum-shaped status value. */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge variant={toneFor(status)} tone="label" className={cn(className)}>
      {humanizeEnum(status)}
    </Badge>
  );
}

/** Active / Inactive, the most common boolean state in the app. */
export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "sage" : "stone"} tone="label">
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}
