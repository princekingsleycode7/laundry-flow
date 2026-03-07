import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";

const statusColors: Record<string, string> = {
  pending: "bg-[hsl(var(--status-pending))]/15 text-[hsl(var(--status-pending))]",
  washing: "bg-[hsl(var(--status-washing))]/15 text-[hsl(var(--status-washing))]",
  drying: "bg-[hsl(var(--status-drying))]/15 text-[hsl(var(--status-drying))]",
  ready: "bg-[hsl(var(--status-ready))]/15 text-[hsl(var(--status-ready))]",
  picked_up: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        statusColors[status] || "bg-muted text-muted-foreground"
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
