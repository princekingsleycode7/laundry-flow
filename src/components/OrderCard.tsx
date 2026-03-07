import { useNavigate } from "react-router-dom";
import { Package, Droplets, Wind, Weight, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { SERVICE_LABELS, STATUS_ACTION_LABELS, STATUS_NEXT } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    service_type: string;
    weight: number;
    weight_unit: string;
    price: number;
    updated_at: string;
    customers: { name: string } | null;
  };
  onStatusUpdate: (orderId: string, newStatus: string) => void;
}

const serviceIcons: Record<string, typeof Package> = {
  wash_and_fold: Package,
  dry_clean: Droplets,
  ironing: Wind,
};

export function OrderCard({ order, onStatusUpdate }: OrderCardProps) {
  const navigate = useNavigate();
  const ServiceIcon = serviceIcons[order.service_type] || Package;
  const nextStatus = STATUS_NEXT[order.status];

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/orders/${order.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-foreground">#{order.order_number}</p>
          <p className="text-sm text-muted-foreground">{order.customers?.name || "Unknown"}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <ServiceIcon className="h-3.5 w-3.5" />
          {SERVICE_LABELS[order.service_type]}
        </span>
        <span className="flex items-center gap-1">
          <Weight className="h-3.5 w-3.5" />
          {order.weight} {order.weight_unit}
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5" />
          ${Number(order.price).toFixed(2)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Updated {formatDistanceToNow(new Date(order.updated_at), { addSuffix: true })}
        </p>
        {nextStatus && (
          <Button
            size="sm"
            variant={order.status === "ready" ? "default" : "outline"}
            className="text-xs h-7"
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(order.id, nextStatus);
            }}
          >
            {STATUS_ACTION_LABELS[order.status]}
          </Button>
        )}
      </div>
    </Card>
  );
}
