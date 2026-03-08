import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, MessageCircle, CheckCircle, Clock, Package, Droplets, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_LABELS, STATUS_ACTION_LABELS, STATUS_NEXT, SERVICE_LABELS } from "@/lib/constants";
import { format } from "date-fns";
import { toast } from "sonner";

const serviceIcons: Record<string, typeof Package> = {
  wash_and_fold: Package,
  dry_clean: Droplets,
  ironing: Wind,
};

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, customers(name, phone)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["order-timeline", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_timeline")
        .select("*")
        .eq("order_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus as any })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: async (_data, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["order-timeline", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status updated");

      // Trigger SMS notification when status becomes "ready"
      if (newStatus === "ready") {
        try {
          const { error } = await supabase.functions.invoke("notify-order-ready", {
            body: { order_id: id },
          });
          if (error) throw error;
          toast.success("Customer notified via SMS");
        } catch (e) {
          console.error("SMS notification failed:", e);
          toast.error("Failed to send SMS notification");
        }
      }
    },
    onError: () => toast.error("Failed to update status"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Order not found
      </div>
    );
  }

  const ServiceIcon = serviceIcons[order.service_type] || Package;
  const nextStatus = STATUS_NEXT[order.status];

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Order #{order.order_number}</h1>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Status Card */}
        <Card className="p-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Order Status</p>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            {order.status === "ready" && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--status-ready))]" />
                Ready for pickup
              </span>
            )}
          </div>
        </Card>

        {/* Customer Card */}
        <Card className="p-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Customer Details</p>
          <p className="font-semibold">{order.customers?.name || "Unknown"}</p>
          {order.customers?.phone && (
            <p className="text-sm text-muted-foreground">{order.customers.phone}</p>
          )}
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-1" /> Chat
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4 mr-1" /> Call
            </Button>
          </div>
        </Card>

        {/* Order Items */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Order Items</p>
            <span className="text-xs text-muted-foreground">1 ITEM</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <ServiceIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{SERVICE_LABELS[order.service_type]}</p>
              <p className="text-xs text-muted-foreground">Weight: {order.weight} {order.weight_unit}</p>
            </div>
            <p className="font-semibold">${Number(order.price).toFixed(2)}</p>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${Number(order.price).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Cost</span>
              <span>${Number(order.price).toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Special Instructions */}
        {order.special_instructions && (
          <Card className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Special Instructions</p>
            <p className="text-sm">{order.special_instructions}</p>
          </Card>
        )}

        {/* Timeline */}
        <Card className="p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Order Timeline</p>
          <div className="space-y-4">
            {timeline.map((entry, i) => (
              <div key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-4">
                  <p className="font-medium text-sm">{STATUS_LABELS[entry.status]}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        {nextStatus && (
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => updateStatus.mutate(nextStatus)}
              disabled={updateStatus.isPending}
            >
              {STATUS_ACTION_LABELS[order.status]}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
