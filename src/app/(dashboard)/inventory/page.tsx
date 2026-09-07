import { getActorContextFromSession } from "@/lib/auth/actor-context";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { toProductOutput } from "@/modules/inventory/product.schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader, SectionHeader, EmptyRow } from "@/components/page-header";

/** A quiet proportional bar: stock on hand relative to its reorder level. */
function StockBar({ onHand, reorder }: { onHand: number; reorder: number }) {
  const ceiling = Math.max(reorder * 2, onHand, 1);
  const pct = Math.min(100, Math.round((onHand / ceiling) * 100));
  const low = reorder > 0 && onHand <= reorder;
  return (
    <div className="flex items-center gap-2.5">
      <span data-numeric className="w-10 text-right tabular-nums">
        {onHand}
      </span>
      <span
        aria-hidden
        className="h-1.5 w-20 overflow-hidden rounded-full bg-muted ring-1 ring-border/70"
      >
        <span
          className={`block h-full rounded-full ${low ? "bg-clay" : "bg-sage"}`}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </span>
    </div>
  );
}

export default async function InventoryPage() {
  const ctx = await getActorContextFromSession();
  const products = (await inventoryService.listProducts(ctx)).map(toProductOutput);
  const lowStockIds = new Set((await inventoryService.getLowStockProducts(ctx)).map((p) => p.id));
  const expiring = await inventoryService.getExpiringProducts(ctx, 30);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Operations"
        title="Inventory"
        description={`${products.length} products tracked · ${lowStockIds.size} at or below reorder level`}
      />

      <section>
        <SectionHeader title="Stock on hand" />
        <div className="table-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>On hand</TableHead>
                <TableHead className="text-right">Reorder level</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <EmptyRow
                  colSpan={5}
                  title="No products yet"
                  hint="Add consumables and stock items to track usage and reorders."
                />
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.unit}</TableCell>
                    <TableCell>
                      <StockBar onHand={p.quantityOnHand} reorder={p.reorderLevel} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.reorderLevel}
                    </TableCell>
                    <TableCell className="text-right">
                      {lowStockIds.has(p.id) ? (
                        <Badge variant="clay" tone="label">
                          Low stock
                        </Badge>
                      ) : (
                        <Badge variant="sage" tone="label">
                          In stock
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <SectionHeader
          title="Expiring soon"
          description="Batches reaching their expiry date within 30 days."
        />
        <div className="table-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiring.length === 0 ? (
                <EmptyRow
                  colSpan={4}
                  title="Nothing expiring"
                  hint="No batch reaches its expiry date in the next 30 days."
                />
              ) : (
                expiring.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.product.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.batchNumber}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(b.quantityOnHand)}
                    </TableCell>
                    <TableCell className="text-right">
                      {b.expiryDate ? (
                        <Badge variant="honey" tone="label">
                          {new Date(b.expiryDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
