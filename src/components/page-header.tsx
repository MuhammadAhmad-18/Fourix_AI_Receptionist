import { cn } from "cn";

/**
 * The shared masthead for every page: a small tracked eyebrow, a serif title
 * in plum, an optional lede, an optional action slot, and a brass hairline.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
          <h1 className="page-title">{title}</h1>
          {description && (
            <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      <div className="brass-rule" />
    </header>
  );
}

/** A secondary heading for the second table on a two-table page. */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-heading text-lg leading-tight font-medium tracking-[-0.015em]">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Consistent empty state for tables that legitimately have no rows. */
export function EmptyRow({
  colSpan,
  title,
  hint,
}: {
  colSpan: number;
  title: string;
  hint?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
          <span className="font-heading text-base text-foreground/70">{title}</span>
          {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
        </div>
      </td>
    </tr>
  );
}
